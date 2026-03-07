use near_sdk::borsh::{BorshDeserialize, BorshSerialize};
use near_sdk::json_types::U128;
use near_sdk::store::Vector;
use near_sdk::{
    env, log, near, AccountId, BorshStorageKey, Gas, NearToken, PanicOnDefault, Promise,
};
use near_sdk::serde::{Deserialize, Serialize};

/// USDC contract on NEAR mainnet.
const USDC_CONTRACT: &str = "17208628f84f5d6ad33f0da3bbbeb27ffcb398eac501a31bd6ad2011e36133a1";

/// Gas allocated to each ft_transfer cross-contract call.
const GAS_FOR_FT_TRANSFER: Gas = Gas::from_tgas(10);

/// Nanoseconds in one day.
const NANOS_PER_DAY: u64 = 86_400_000_000_000;

/// Nanoseconds in one week.
const NANOS_PER_WEEK: u64 = 7 * NANOS_PER_DAY;

// ── Storage keys ────────────────────────────────────────────────────────────

#[derive(BorshStorageKey, BorshSerialize)]
#[borsh(crate = "near_sdk::borsh")]
enum StorageKey {
    Kids,
}

// ── Kid struct ──────────────────────────────────────────────────────────────

#[derive(BorshDeserialize, BorshSerialize, Serialize, Deserialize, Clone)]
#[borsh(crate = "near_sdk::borsh")]
#[serde(crate = "near_sdk::serde")]
pub struct Kid {
    pub name: String,
    pub wallet_id: AccountId,
    pub amount: U128,
    pub active: bool,
}

// ── Config view struct ──────────────────────────────────────────────────────

#[derive(Serialize, Deserialize)]
#[serde(crate = "near_sdk::serde")]
pub struct Config {
    pub owner_id: AccountId,
    pub kids: Vec<Kid>,
    pub transfer_day: u8,
    pub last_paid_week: u64,
}

// ── Contract ────────────────────────────────────────────────────────────────

#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct AllowanceContract {
    owner_id: AccountId,
    kids: Vector<Kid>,
    transfer_day: u8,
    last_paid_week: u64,
}

#[near]
impl AllowanceContract {
    // ── Init ────────────────────────────────────────────────────────────

    #[init]
    #[handle_result]
    pub fn new(owner_id: AccountId) -> Result<Self, &'static str> {
        if env::state_exists() {
            return Err("Contract is already initialized");
        }
        Ok(Self {
            owner_id,
            kids: Vector::new(StorageKey::Kids),
            transfer_day: 5, // Friday
            last_paid_week: 0,
        })
    }

    // ── Owner-only helpers ──────────────────────────────────────────────

    fn assert_owner(&self) {
        assert_eq!(
            env::predecessor_account_id(),
            self.owner_id,
            "Only the owner can call this method"
        );
    }

    // ── Owner-only mutators ─────────────────────────────────────────────

    pub fn add_kid(&mut self, name: String, wallet_id: AccountId, amount: U128) {
        self.assert_owner();
        assert!(amount.0 > 0, "Amount must be greater than zero");

        // Prevent duplicate wallet_id.
        for kid in self.kids.iter() {
            assert!(
                kid.wallet_id != wallet_id,
                "A kid with this wallet_id already exists"
            );
        }

        self.kids.push(Kid {
            name,
            wallet_id,
            amount,
            active: true,
        });
        log!("Kid added");
    }

    pub fn remove_kid(&mut self, wallet_id: AccountId) {
        self.assert_owner();

        let index = self
            .kids
            .iter()
            .position(|k| k.wallet_id == wallet_id)
            .expect("Kid not found");

        // Swap-remove is O(1); order is not guaranteed but that is acceptable.
        self.kids.swap_remove(index as u32);
        log!("Kid removed");
    }

    pub fn update_kid_amount(&mut self, wallet_id: AccountId, amount: U128) {
        self.assert_owner();
        assert!(amount.0 > 0, "Amount must be greater than zero");

        for i in 0..self.kids.len() {
            let kid = self.kids.get(i).unwrap();
            if kid.wallet_id == wallet_id {
                let mut updated = kid.clone();
                updated.amount = amount;
                self.kids.replace(i, updated);
                log!("Kid amount updated");
                return;
            }
        }
        panic!("Kid not found");
    }

    pub fn update_kid_name(&mut self, wallet_id: AccountId, name: String) {
        self.assert_owner();

        for i in 0..self.kids.len() {
            let kid = self.kids.get(i).unwrap();
            if kid.wallet_id == wallet_id {
                let mut updated = kid.clone();
                updated.name = name;
                self.kids.replace(i, updated);
                log!("Kid name updated");
                return;
            }
        }
        panic!("Kid not found");
    }

    pub fn set_transfer_day(&mut self, day: u8) {
        self.assert_owner();
        assert!(day <= 6, "Day must be 0 (Sunday) through 6 (Saturday)");
        self.transfer_day = day;
        log!("Transfer day updated to {}", day);
    }

    // ── Permissionless distribute ───────────────────────────────────────

    pub fn distribute(&mut self) -> Promise {
        let timestamp = env::block_timestamp();
        let day_of_week = ((timestamp / NANOS_PER_DAY) + 4) % 7; // 0=Sunday
        let current_week = timestamp / NANOS_PER_WEEK;

        assert_eq!(
            day_of_week as u8, self.transfer_day,
            "Today is not the configured transfer day"
        );
        assert!(
            current_week != self.last_paid_week,
            "Already paid this week"
        );

        // Collect active kids so we know how many transfers to issue.
        let active_kids: Vec<Kid> = self
            .kids
            .iter()
            .filter(|k| k.active)
            .cloned()
            .collect();

        assert!(!active_kids.is_empty(), "No active kids to pay");

        // Mark week as paid.
        self.last_paid_week = current_week;

        let usdc: AccountId = USDC_CONTRACT.parse().unwrap();

        // Build a chain of ft_transfer promises.
        let mut promise = Promise::new(usdc.clone()).function_call(
            "ft_transfer".to_string(),
            near_sdk::serde_json::json!({
                "receiver_id": active_kids[0].wallet_id.to_string(),
                "amount": active_kids[0].amount.0.to_string(),
                "memo": format!("Allowance for {}", active_kids[0].name),
            })
            .to_string()
            .into_bytes(),
            NearToken::from_yoctonear(1),
            GAS_FOR_FT_TRANSFER,
        );

        for kid in active_kids.iter().skip(1) {
            promise = promise.and(Promise::new(usdc.clone()).function_call(
                "ft_transfer".to_string(),
                near_sdk::serde_json::json!({
                    "receiver_id": kid.wallet_id.to_string(),
                    "amount": kid.amount.0.to_string(),
                    "memo": format!("Allowance for {}", kid.name),
                })
                .to_string()
                .into_bytes(),
                NearToken::from_yoctonear(1),
                GAS_FOR_FT_TRANSFER,
            ));
        }

        log!(
            "Distributing allowance to {} kid(s) for week {}",
            active_kids.len(),
            current_week
        );

        promise
    }

    // ── NEP-141 receiver (accept USDC deposits) ────────────────────────

    /// Called by the USDC token contract when someone sends USDC to this contract.
    /// Returns "0" to signal that the full amount is accepted (nothing refunded).
    pub fn ft_on_transfer(
        &mut self,
        sender_id: AccountId,
        amount: U128,
        msg: String,
    ) -> String {
        let usdc: AccountId = USDC_CONTRACT.parse().unwrap();
        assert_eq!(
            env::predecessor_account_id(),
            usdc,
            "Only USDC transfers are accepted"
        );

        log!(
            "Received {} USDC micro-units from {} (msg: {})",
            amount.0,
            sender_id,
            msg
        );

        // Return "0" — accept the entire deposit, refund nothing.
        "0".to_string()
    }

    // ── View methods ────────────────────────────────────────────────────

    pub fn get_config(&self) -> Config {
        Config {
            owner_id: self.owner_id.clone(),
            kids: self.kids.iter().cloned().collect(),
            transfer_day: self.transfer_day,
            last_paid_week: self.last_paid_week,
        }
    }

    pub fn get_kids(&self) -> Vec<Kid> {
        self.kids.iter().cloned().collect()
    }
}

// ── Unit tests ──────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    fn owner() -> AccountId {
        "parent.near".parse().unwrap()
    }

    fn kid_wallet() -> AccountId {
        "kid1.near".parse().unwrap()
    }

    fn setup_context(predecessor: AccountId) {
        let context = VMContextBuilder::new()
            .predecessor_account_id(predecessor)
            .build();
        testing_env!(context);
    }

    #[test]
    fn test_init() {
        setup_context(owner());
        let contract = AllowanceContract::new(owner()).unwrap();
        assert_eq!(contract.owner_id, owner());
        assert_eq!(contract.transfer_day, 5);
        assert_eq!(contract.last_paid_week, 0);
        assert_eq!(contract.get_kids().len(), 0);
    }

    #[test]
    fn test_add_and_get_kids() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));

        let kids = contract.get_kids();
        assert_eq!(kids.len(), 1);
        assert_eq!(kids[0].name, "Alice");
        assert_eq!(kids[0].amount.0, 5_000_000);
        assert!(kids[0].active);
    }

    #[test]
    #[should_panic(expected = "Only the owner can call this method")]
    fn test_add_kid_not_owner() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();

        setup_context("stranger.near".parse().unwrap());
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));
    }

    #[test]
    fn test_remove_kid() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));
        assert_eq!(contract.get_kids().len(), 1);

        contract.remove_kid(kid_wallet());
        assert_eq!(contract.get_kids().len(), 0);
    }

    #[test]
    fn test_update_kid_amount() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));
        contract.update_kid_amount(kid_wallet(), U128(10_000_000));

        let kids = contract.get_kids();
        assert_eq!(kids[0].amount.0, 10_000_000);
    }

    #[test]
    fn test_update_kid_name() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));
        contract.update_kid_name(kid_wallet(), "Alicia".to_string());

        let kids = contract.get_kids();
        assert_eq!(kids[0].name, "Alicia");
    }

    #[test]
    fn test_set_transfer_day() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.set_transfer_day(0); // Sunday
        assert_eq!(contract.get_config().transfer_day, 0);
    }

    #[test]
    #[should_panic(expected = "Day must be 0 (Sunday) through 6 (Saturday)")]
    fn test_set_transfer_day_invalid() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.set_transfer_day(7);
    }

    #[test]
    #[should_panic(expected = "Amount must be greater than zero")]
    fn test_add_kid_zero_amount() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(0));
    }

    #[test]
    #[should_panic(expected = "A kid with this wallet_id already exists")]
    fn test_add_duplicate_kid() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));
        contract.add_kid("Bob".to_string(), kid_wallet(), U128(3_000_000));
    }

    #[test]
    fn test_get_config() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();
        contract.add_kid("Alice".to_string(), kid_wallet(), U128(5_000_000));

        let config = contract.get_config();
        assert_eq!(config.owner_id, owner());
        assert_eq!(config.transfer_day, 5);
        assert_eq!(config.last_paid_week, 0);
        assert_eq!(config.kids.len(), 1);
    }

    #[test]
    fn test_ft_on_transfer_accepts_usdc() {
        let usdc: AccountId = USDC_CONTRACT.parse().unwrap();
        let context = VMContextBuilder::new()
            .predecessor_account_id(usdc)
            .build();
        testing_env!(context);

        // Need a fresh init context first.
        let context2 = VMContextBuilder::new()
            .predecessor_account_id(owner())
            .build();
        testing_env!(context2);
        let mut contract = AllowanceContract::new(owner()).unwrap();

        // Now call ft_on_transfer as the USDC contract.
        let context3 = VMContextBuilder::new()
            .predecessor_account_id(USDC_CONTRACT.parse().unwrap())
            .build();
        testing_env!(context3);

        let result = contract.ft_on_transfer(
            owner(),
            U128(10_000_000),
            "deposit".to_string(),
        );
        assert_eq!(result, "0");
    }

    #[test]
    #[should_panic(expected = "Only USDC transfers are accepted")]
    fn test_ft_on_transfer_rejects_non_usdc() {
        setup_context(owner());
        let mut contract = AllowanceContract::new(owner()).unwrap();

        setup_context("random-token.near".parse().unwrap());
        contract.ft_on_transfer(
            owner(),
            U128(10_000_000),
            "deposit".to_string(),
        );
    }
}
