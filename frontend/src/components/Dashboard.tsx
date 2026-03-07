"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  Skeleton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import PaymentsIcon from "@mui/icons-material/Payments";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import { useWallet } from "./WalletProvider";
import KidsList from "./KidsList";
import AddKidDialog from "./AddKidDialog";
import EditKidDialog from "./EditKidDialog";
import FundDialog from "./FundDialog";
import CrossChainFundDialog from "./CrossChainFundDialog";
import SettingsCard from "./SettingsCard";
import {
  getConfig,
  getContractUSDCBalance,
  getVaultBalance,
  getUsdcApy,
  addKid,
  removeKid,
  updateKidAmount,
  setTransferDay,
  distribute,
  fundContract,
} from "@/lib/near";
import type { Config, Kid } from "@/lib/types";
import {
  formatUSDC,
  dollarsToMicro,
  dayName,
  getNextPaymentDate,
  formatDate,
  getTotalWeekly,
  formatApy,
} from "@/lib/utils";
import type { WalletCallMethod } from "@/lib/near";

export default function Dashboard() {
  const { accountId, wallet } = useWallet();

  const [config, setConfig] = useState<Config | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [vaultBalance, setVaultBalance] = useState<string>("0");
  const [usdcApy, setUsdcApy] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Dialog states
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [fundDialogOpen, setFundDialogOpen] = useState(false);
  const [crossChainDialogOpen, setCrossChainDialogOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<Kid | null>(null);

  // Snackbar
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error" | "info";
  }>({ open: false, message: "", severity: "info" });

  const showSnackbar = useCallback(
    (message: string, severity: "success" | "error" | "info" = "success") => {
      setSnackbar({ open: true, message, severity });
    },
    []
  );

  const fetchData = useCallback(async () => {
    try {
      const [cfg, bal, vBal, apy] = await Promise.all([
        getConfig(),
        getContractUSDCBalance(),
        getVaultBalance(),
        getUsdcApy(),
      ]);
      setConfig(cfg);
      setBalance(bal);
      setVaultBalance(vBal);
      setUsdcApy(apy);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      showSnackbar("Failed to load contract data", "error");
    } finally {
      setLoadingData(false);
    }
  }, [showSnackbar]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getWalletCallMethod = useCallback((): WalletCallMethod | null => {
    if (!wallet) return null;
    return wallet as unknown as WalletCallMethod;
  }, [wallet]);

  // ─── Handlers ────────────────────────────────────────────

  const handleAddKid = useCallback(
    async (name: string, walletId: string, amountDollars: number) => {
      const w = getWalletCallMethod();
      if (!w || !accountId) return;
      setActionLoading(true);
      try {
        await addKid(w, accountId, name, walletId, dollarsToMicro(amountDollars));
        showSnackbar(`${name} added successfully!`);
        setAddDialogOpen(false);
        await fetchData();
      } catch (err) {
        console.error("Failed to add kid:", err);
        showSnackbar("Failed to add recipient", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [getWalletCallMethod, accountId, showSnackbar, fetchData]
  );

  const handleRemoveKid = useCallback(
    async (walletId: string) => {
      const w = getWalletCallMethod();
      if (!w || !accountId) return;
      setActionLoading(true);
      try {
        await removeKid(w, accountId, walletId);
        showSnackbar("Recipient removed");
        await fetchData();
      } catch (err) {
        console.error("Failed to remove kid:", err);
        showSnackbar("Failed to remove recipient", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [getWalletCallMethod, accountId, showSnackbar, fetchData]
  );

  const handleEditKid = useCallback(
    async (walletId: string, amountDollars: number) => {
      const w = getWalletCallMethod();
      if (!w || !accountId) return;
      setActionLoading(true);
      try {
        await updateKidAmount(w, accountId, walletId, dollarsToMicro(amountDollars));
        showSnackbar("Amount updated!");
        setEditDialogOpen(false);
        setEditingKid(null);
        await fetchData();
      } catch (err) {
        console.error("Failed to update amount:", err);
        showSnackbar("Failed to update amount", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [getWalletCallMethod, accountId, showSnackbar, fetchData]
  );

  const handleSetTransferDay = useCallback(
    async (day: number) => {
      const w = getWalletCallMethod();
      if (!w || !accountId) return;
      setActionLoading(true);
      try {
        await setTransferDay(w, accountId, day);
        showSnackbar(`Payment day set to ${dayName(day)}`);
        await fetchData();
      } catch (err) {
        console.error("Failed to set transfer day:", err);
        showSnackbar("Failed to update payment day", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [getWalletCallMethod, accountId, showSnackbar, fetchData]
  );

  const handleDistribute = useCallback(async () => {
    const w = getWalletCallMethod();
    if (!w || !accountId) return;
    setActionLoading(true);
    try {
      await distribute(w, accountId);
      showSnackbar("Payments distributed successfully!");
      await fetchData();
    } catch (err) {
      console.error("Failed to distribute:", err);
      showSnackbar("Failed to distribute payments", "error");
    } finally {
      setActionLoading(false);
    }
  }, [getWalletCallMethod, accountId, showSnackbar, fetchData]);

  const handleFund = useCallback(
    async (amountDollars: number) => {
      const w = getWalletCallMethod();
      if (!w || !accountId) return;
      setActionLoading(true);
      try {
        await fundContract(w, accountId, dollarsToMicro(amountDollars));
        showSnackbar(`${formatUSDC(dollarsToMicro(amountDollars))} funded!`);
        setFundDialogOpen(false);
        await fetchData();
      } catch (err) {
        console.error("Failed to fund:", err);
        showSnackbar("Failed to fund contract", "error");
      } finally {
        setActionLoading(false);
      }
    },
    [getWalletCallMethod, accountId, showSnackbar, fetchData]
  );

  const openEditDialog = useCallback((kid: Kid) => {
    setEditingKid(kid);
    setEditDialogOpen(true);
  }, []);

  // ─── Not connected state ─────────────────────────────────

  if (!accountId) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          textAlign: "center",
          px: 3,
        }}
      >
        <AccountBalanceWalletIcon
          sx={{ fontSize: 80, color: "primary.main", mb: 3, opacity: 0.7 }}
        />
        <Typography variant="h4" gutterBottom>
          Welcome to Allowance
        </Typography>
        <Typography
          variant="body1"
          color="text.secondary"
          sx={{ maxWidth: 460, mb: 3 }}
        >
          Automate your kids' weekly allowance with USDC on NEAR. Connect your
          wallet to get started.
        </Typography>
      </Box>
    );
  }

  // ─── Loading state ────────────────────────────────────────

  if (loadingData) {
    return (
      <Box sx={{ maxWidth: 900, mx: "auto", p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton
              variant="rounded"
              height={160}
              sx={{ borderRadius: 4 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Skeleton
              variant="rounded"
              height={160}
              sx={{ borderRadius: 4 }}
            />
          </Grid>
          <Grid size={12}>
            <Skeleton
              variant="rounded"
              height={200}
              sx={{ borderRadius: 4 }}
            />
          </Grid>
        </Grid>
      </Box>
    );
  }

  const kids = config?.kids ?? [];
  const transferDay = config?.transfer_day ?? 5;
  const totalWeekly = getTotalWeekly(kids);
  const nextPayment = getNextPaymentDate(transferDay);
  const isOwner = config?.owner_id === accountId;

  return (
    <Box sx={{ maxWidth: 900, mx: "auto", p: { xs: 2, sm: 3 } }}>
      {/* Balance and Next Payment Cards */}
      <Grid container spacing={2.5} sx={{ mb: 3 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card
            sx={{
              background: "linear-gradient(135deg, #1a237e 0%, #534bae 100%)",
              color: "white",
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <AccountBalanceWalletIcon sx={{ opacity: 0.8 }} />
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  Vault Balance
                </Typography>
              </Box>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  letterSpacing: "-0.02em",
                  mb: 0.5,
                }}
              >
                {formatUSDC(vaultBalance)}
              </Typography>
              {usdcApy > 0 && (
                <Box
                  sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}
                >
                  <TrendingUpIcon sx={{ fontSize: 18, opacity: 0.9 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {formatApy(usdcApy)} APY
                  </Typography>
                </Box>
              )}
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.5 }}
              >
                <TrendingUpIcon sx={{ fontSize: 18, opacity: 0.7 }} />
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  {formatUSDC(totalWeekly.toString())} weekly
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{ opacity: 0.5, display: "block", mt: 1.5 }}
              >
                Earning yield via RHEA Finance
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ height: "100%" }}>
            <CardContent sx={{ p: 3 }}>
              <Box
                sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}
              >
                <CalendarTodayIcon color="primary" sx={{ opacity: 0.7 }} />
                <Typography variant="body2" color="text.secondary">
                  Next Payment
                </Typography>
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  color: "primary.main",
                  mb: 0.5,
                }}
              >
                {dayName(transferDay)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatDate(nextPayment)}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 1 }}
              >
                {kids.filter((k) => k.active).length} active recipient
                {kids.filter((k) => k.active).length !== 1 ? "s" : ""}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Action Buttons */}
      {isOwner && (
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            mb: 3,
            flexWrap: "wrap",
          }}
        >
          <Button
            variant="contained"
            startIcon={<AccountBalanceWalletIcon />}
            onClick={() => setFundDialogOpen(true)}
          >
            Fund Wallet
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<SwapHorizIcon />}
            onClick={() => setCrossChainDialogOpen(true)}
          >
            Fund from Any Chain
          </Button>
          <Button
            variant="contained"
            color="secondary"
            startIcon={
              actionLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PaymentsIcon />
              )
            }
            onClick={handleDistribute}
            disabled={actionLoading || kids.length === 0}
          >
            Pay Now
          </Button>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setAddDialogOpen(true)}
          >
            Add Recipient
          </Button>
        </Box>
      )}

      {/* Kids List and Settings */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              Recipients
            </Typography>
            <KidsList
              kids={kids}
              onEdit={openEditDialog}
              onRemove={handleRemoveKid}
              disabled={!isOwner || actionLoading}
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Typography variant="h6" sx={{ mb: 1.5 }}>
            Settings
          </Typography>
          <SettingsCard
            currentDay={transferDay}
            onSave={handleSetTransferDay}
            loading={actionLoading}
            disabled={!isOwner}
          />
        </Grid>
      </Grid>

      {/* Dialogs */}
      <AddKidDialog
        open={addDialogOpen}
        onClose={() => setAddDialogOpen(false)}
        onAdd={handleAddKid}
        loading={actionLoading}
      />
      <EditKidDialog
        open={editDialogOpen}
        onClose={() => {
          setEditDialogOpen(false);
          setEditingKid(null);
        }}
        kid={editingKid}
        onSave={handleEditKid}
        loading={actionLoading}
      />
      <FundDialog
        open={fundDialogOpen}
        onClose={() => setFundDialogOpen(false)}
        onFund={handleFund}
        loading={actionLoading}
        walletConnected={!!accountId}
        onOpenCrossChain={() => {
          setFundDialogOpen(false);
          setCrossChainDialogOpen(true);
        }}
      />
      <CrossChainFundDialog
        open={crossChainDialogOpen}
        onClose={() => setCrossChainDialogOpen(false)}
        onFundContract={() => {
          setCrossChainDialogOpen(false);
          setFundDialogOpen(true);
        }}
      />

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={5000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", borderRadius: 3 }}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
