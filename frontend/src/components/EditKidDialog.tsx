"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  InputAdornment,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import type { Kid } from "@/lib/types";

interface EditKidDialogProps {
  open: boolean;
  onClose: () => void;
  kid: Kid | null;
  onSave: (walletId: string, amountDollars: number) => Promise<void>;
  loading: boolean;
}

export default function EditKidDialog({
  open,
  onClose,
  kid,
  onSave,
  loading,
}: EditKidDialogProps) {
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (kid) {
      setAmount((Number(kid.amount) / 1_000_000).toFixed(2));
      setError("");
    }
  }, [kid]);

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
    if (parsed > 10000) {
      setError("Amount seems too high (max $10,000)");
      return false;
    }
    setError("");
    return true;
  }, [amount]);

  const handleSubmit = useCallback(async () => {
    if (!kid || !validate()) return;
    await onSave(kid.wallet_id, parseFloat(amount));
  }, [kid, validate, onSave, amount]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <EditIcon color="primary" />
        Edit {kid?.name ?? "Recipient"}
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={kid?.name ?? ""}
            disabled
            fullWidth
          />
          <TextField
            label="Wallet"
            value={kid?.wallet_id ?? ""}
            disabled
            fullWidth
          />
          <TextField
            label="Weekly Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!error}
            helperText={error}
            fullWidth
            type="number"
            autoFocus
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
