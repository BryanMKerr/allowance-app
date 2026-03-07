"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  Typography,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tooltip,
  Alert,
  Stepper,
  Step,
  StepLabel,
  CircularProgress,
  Chip,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import {
  SUPPORTED_CHAINS,
  getQuote,
  submitDeposit,
  getStatus,
  type QuoteResponse,
  type DepositStatus,
} from "@/lib/crosschain";
import { useWallet } from "./WalletProvider";

interface CrossChainFundDialogProps {
  open: boolean;
  onClose: () => void;
  onFundContract?: () => void;
}

const STEPS = [
  "Get Deposit Address",
  "Send USDC",
  "Bridging to NEAR",
  "Complete",
];

function statusToStep(status: DepositStatus | null): number {
  switch (status) {
    case "PENDING_DEPOSIT":
      return 1;
    case "KNOWN_DEPOSIT_TX":
      return 2;
    case "PROCESSING":
      return 2;
    case "SUCCESS":
      return 3;
    default:
      return 0;
  }
}

export default function CrossChainFundDialog({
  open,
  onClose,
  onFundContract,
}: CrossChainFundDialogProps) {
  const { accountId } = useWallet();

  const [chain, setChain] = useState("ethereum");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  // Quote state
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Status polling
  const [depositStatus, setDepositStatus] = useState<DepositStatus | null>(
    null
  );
  const [polling, setPolling] = useState(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // TX hash (optional submission)
  const [txHash, setTxHash] = useState("");

  const [copied, setCopied] = useState(false);

  // ─── Cleanup polling on unmount / close ──────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
    setPolling(false);
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  // ─── Reset state when dialog closes ──────────────────────
  const handleClose = useCallback(() => {
    stopPolling();
    setChain("ethereum");
    setAmount("");
    setError("");
    setQuote(null);
    setDepositStatus(null);
    setTxHash("");
    setCopied(false);
    onClose();
  }, [onClose, stopPolling]);

  // ─── Get Quote ──────────────────────────────────────────
  const handleGetQuote = useCallback(async () => {
    if (!accountId) {
      setError("Connect your NEAR wallet first");
      return;
    }
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid USDC amount greater than 0");
      return;
    }
    setError("");
    setQuoteLoading(true);
    try {
      const q = await getQuote(chain, amount, accountId);
      setQuote(q);
      setDepositStatus("PENDING_DEPOSIT");
    } catch (err) {
      console.error("Quote error:", err);
      setError(err instanceof Error ? err.message : "Failed to get quote");
    } finally {
      setQuoteLoading(false);
    }
  }, [accountId, amount, chain]);

  // ─── Copy deposit address ───────────────────────────────
  const handleCopy = useCallback(async () => {
    if (!quote?.depositAddress) return;
    await navigator.clipboard.writeText(quote.depositAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [quote]);

  // ─── Start polling ─────────────────────────────────────
  const startPolling = useCallback(() => {
    if (!quote?.id) return;
    setPolling(true);

    // Optionally submit tx hash
    if (txHash.trim()) {
      submitDeposit(quote.id, txHash.trim()).catch(console.error);
    }

    const poll = async () => {
      try {
        const result = await getStatus(quote.id);
        setDepositStatus(result.status);
        if (result.status === "SUCCESS") {
          stopPolling();
        }
      } catch (err) {
        console.error("Status poll error:", err);
      }
    };

    // Poll immediately, then every 5 seconds
    poll();
    pollIntervalRef.current = setInterval(poll, 5000);
  }, [quote, txHash, stopPolling]);

  // ─── Derived state ─────────────────────────────────────
  const activeStep = statusToStep(depositStatus);
  const chainInfo = SUPPORTED_CHAINS[chain];
  const isComplete = depositStatus === "SUCCESS";

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <SwapHorizIcon color="primary" />
        Fund from Another Chain
      </DialogTitle>
      <DialogContent>
        <Box
          sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}
        >
          {/* Status Stepper */}
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* ─── Step 0: Chain + Amount Selection ──────── */}
          {!quote && (
            <>
              <Typography variant="body2" color="text.secondary">
                Bridge USDC from any supported EVM chain to your NEAR wallet
                using NEAR Intents.
              </Typography>

              <FormControl fullWidth>
                <InputLabel id="chain-select-label">Source Chain</InputLabel>
                <Select
                  labelId="chain-select-label"
                  value={chain}
                  label="Source Chain"
                  onChange={(e) => setChain(e.target.value)}
                >
                  {Object.entries(SUPPORTED_CHAINS).map(([key, info]) => (
                    <MenuItem key={key} value={key}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1.5,
                        }}
                      >
                        <Chip
                          label={info.shortName}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: "0.7rem",
                            minWidth: 48,
                          }}
                        />
                        {info.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="USDC Amount"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setError("");
                }}
                error={!!error}
                helperText={error}
                fullWidth
                type="number"
                placeholder="100.00"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">$</InputAdornment>
                  ),
                }}
              />

              <Alert severity="info" sx={{ borderRadius: 2 }}>
                You will receive a deposit address on {chainInfo.name}. Send
                USDC to that address from your EVM wallet (MetaMask, etc.) and
                it will be bridged to your NEAR account.
              </Alert>
            </>
          )}

          {/* ─── Step 1: Show Deposit Address ─────────── */}
          {quote && !isComplete && (
            <>
              <Alert severity="success" sx={{ borderRadius: 2 }}>
                Deposit address ready on {chainInfo.name}. Send exactly{" "}
                <strong>${parseFloat(amount).toFixed(2)} USDC</strong> to the
                address below.
              </Alert>

              <Box>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  gutterBottom
                >
                  Deposit Address ({chainInfo.name})
                </Typography>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    bgcolor: "grey.50",
                    borderRadius: 2,
                    px: 2,
                    py: 1.5,
                    border: "1px solid",
                    borderColor: "grey.200",
                  }}
                >
                  <Typography
                    variant="body2"
                    sx={{
                      fontFamily: "monospace",
                      fontSize: "0.75rem",
                      flex: 1,
                      wordBreak: "break-all",
                    }}
                  >
                    {quote.depositAddress}
                  </Typography>
                  <Tooltip title={copied ? "Copied!" : "Copy address"}>
                    <IconButton onClick={handleCopy} size="small">
                      <ContentCopyIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>

              {/* TX hash input (optional) */}
              {!polling && depositStatus === "PENDING_DEPOSIT" && (
                <>
                  <TextField
                    label="Transaction Hash (optional)"
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    fullWidth
                    placeholder="0x..."
                    helperText="Paste your EVM transaction hash to speed up detection"
                    size="small"
                  />

                  <Button
                    variant="contained"
                    onClick={startPolling}
                    fullWidth
                    sx={{ py: 1.5 }}
                  >
                    I&apos;ve Sent the USDC
                  </Button>
                </>
              )}

              {/* Polling indicator */}
              {polling && !isComplete && (
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 2,
                    py: 2,
                  }}
                >
                  <CircularProgress size={24} />
                  <Typography variant="body2" color="text.secondary">
                    {depositStatus === "PENDING_DEPOSIT" &&
                      "Waiting for your deposit..."}
                    {depositStatus === "KNOWN_DEPOSIT_TX" &&
                      "Deposit detected! Processing..."}
                    {depositStatus === "PROCESSING" &&
                      "Bridging USDC to NEAR..."}
                  </Typography>
                </Box>
              )}
            </>
          )}

          {/* ─── Step 3: Complete ─────────────────────── */}
          {isComplete && (
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 2,
                py: 2,
              }}
            >
              <CheckCircleIcon
                sx={{ fontSize: 64, color: "secondary.main" }}
              />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                USDC Arrived on NEAR
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                textAlign="center"
              >
                ${parseFloat(amount).toFixed(2)} USDC has been bridged to your
                NEAR wallet ({accountId}). You can now fund the allowance
                contract.
              </Typography>

              {onFundContract && (
                <Button
                  variant="contained"
                  onClick={() => {
                    handleClose();
                    onFundContract();
                  }}
                  startIcon={<OpenInNewIcon />}
                  sx={{ mt: 1 }}
                >
                  Fund Allowance Contract
                </Button>
              )}
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose}>
          {isComplete ? "Done" : "Cancel"}
        </Button>
        {!quote && (
          <Button
            variant="contained"
            onClick={handleGetQuote}
            disabled={quoteLoading || !amount}
            startIcon={
              quoteLoading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <SwapHorizIcon />
              )
            }
          >
            {quoteLoading ? "Getting Address..." : "Get Deposit Address"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
