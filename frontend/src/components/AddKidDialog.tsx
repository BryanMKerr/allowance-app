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
  InputAdornment,
} from "@mui/material";
import PersonAddIcon from "@mui/icons-material/PersonAdd";

interface AddKidDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, walletId: string, amountDollars: number) => Promise<void>;
  loading: boolean;
}

export default function AddKidDialog({
  open,
  onClose,
  onAdd,
  loading,
}: AddKidDialogProps) {
  const [name, setName] = useState("");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = useCallback((): boolean => {
    const errs: Record<string, string> = {};

    if (!name.trim()) errs.name = "Name is required";
    if (!walletId.trim()) {
      errs.walletId = "Wallet address is required";
    } else if (!walletId.includes(".") && walletId.length < 2) {
      errs.walletId = "Enter a valid NEAR account ID";
    }

    const parsed = parseFloat(amount);
    if (!amount.trim()) {
      errs.amount = "Amount is required";
    } else if (isNaN(parsed) || parsed <= 0) {
      errs.amount = "Enter a valid amount greater than 0";
    } else if (parsed > 10000) {
      errs.amount = "Amount seems too high (max $10,000)";
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [name, walletId, amount]);

  const handleSubmit = useCallback(async () => {
    if (!validate()) return;
    await onAdd(name.trim(), walletId.trim(), parseFloat(amount));
    setName("");
    setWalletId("");
    setAmount("");
    setErrors({});
  }, [validate, onAdd, name, walletId, amount]);

  const handleClose = useCallback(() => {
    setName("");
    setWalletId("");
    setAmount("");
    setErrors({});
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <PersonAddIcon color="primary" />
        Add Recipient
      </DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            placeholder="e.g. Alex"
            autoFocus
          />
          <TextField
            label="NEAR Wallet Address"
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            error={!!errors.walletId}
            helperText={errors.walletId}
            fullWidth
            placeholder="e.g. alex.near"
          />
          <TextField
            label="Weekly Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={!!errors.amount}
            helperText={errors.amount}
            fullWidth
            type="number"
            placeholder="10.00"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">$</InputAdornment>
              ),
            }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? "Adding..." : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
