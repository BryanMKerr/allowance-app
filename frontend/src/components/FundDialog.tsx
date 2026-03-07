"use client";

import React, { useState, useCallback } from "react";
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
  Divider,
  Tooltip,
  Alert,
} from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import SendIcon from "@mui/icons-material/Send";
import SwapHorizIcon from "@mui/icons-material/SwapHoriz";
import { CONTRACT_ID } from "@/config";

interface FundDialogProps {
  open: boolean;
  onClose: () => void;
  onFund: (amountDollars: number) => Promise<void>;
  loading: boolean;
  walletConnected: boolean;
  onOpenCrossChain?: () => void;
}

export default function FundDialog({
  open,
  onClose,
  onFund,
  loading,
  walletConnected,
  onOpenCrossChain,
}: FundDialogProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(CONTRACT_ID);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  const validate = useCallback((): boolean => {
    const parsed = parseFloat(amount);
    if (!amount.trim()) {
      setError("Amount is required");
      return false;
    }
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid amount greater than 0");
      return false;
    }
    setError("");
    return true;
  }, [amount]);

  const handleFund = useCallback(async () => {
    if (!validate()) return;
    await onFund(parseFloat(amount));
    setAmount("");
    setError("");
  }, [validate, onFund, amount]);

  const handleClose = useCallback(() => {
    setAmount("");
    setError("");
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <AccountBalanceIcon color="primary" />
        Fund Wallet
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Send USDC to the contract address below:
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
                {CONTRACT_ID}
              </Typography>
              <Tooltip title={copied ? "Copied!" : "Copy address"}>
                <IconButton onClick={handleCopy} size="small">
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {walletConnected && (
            <>
              <Divider>
                <Typography variant="body2" color="text.secondary">
                  or transfer directly
                </Typography>
              </Divider>

              <TextField
                label="Amount to Transfer"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
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
                This will transfer USDC from your connected wallet to the
                allowance contract. A 1 yoctoNEAR deposit is required for the
                transfer.
              </Alert>
            </>
          )}

          {onOpenCrossChain && (
            <Box sx={{ textAlign: "center", pt: 1 }}>
              <Divider sx={{ mb: 2 }} />
              <Button
                variant="text"
                size="small"
                startIcon={<SwapHorizIcon />}
                onClick={() => {
                  handleClose();
                  onOpenCrossChain();
                }}
                sx={{ textTransform: "none", color: "text.secondary" }}
              >
                Or fund from another chain (Ethereum, Arbitrum, etc.)
              </Button>
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Close
        </Button>
        {walletConnected && (
          <Button
            variant="contained"
            onClick={handleFund}
            disabled={loading || !amount}
            startIcon={<SendIcon />}
          >
            {loading ? "Sending..." : "Send USDC"}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
