"use client";

import React from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Chip,
  CircularProgress,
} from "@mui/material";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import LogoutIcon from "@mui/icons-material/Logout";
import { useWallet } from "./WalletProvider";
import { truncateAddress } from "@/lib/utils";

export default function Navbar() {
  const { accountId, signIn, signOut, loading } = useWallet();

  return (
    <AppBar
      position="sticky"
      color="inherit"
      sx={{ bgcolor: "white", borderBottom: "1px solid rgba(0,0,0,0.06)" }}
    >
      <Toolbar sx={{ justifyContent: "space-between" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <AccountBalanceWalletIcon color="primary" sx={{ fontSize: 28 }} />
          <Typography
            variant="h6"
            sx={{
              color: "primary.main",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Allowance
          </Typography>
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {loading ? (
            <CircularProgress size={24} />
          ) : accountId ? (
            <>
              <Chip
                label={truncateAddress(accountId)}
                variant="outlined"
                color="primary"
                sx={{ fontWeight: 500 }}
              />
              <Button
                variant="text"
                color="inherit"
                onClick={signOut}
                startIcon={<LogoutIcon />}
                size="small"
                sx={{ color: "text.secondary" }}
              >
                Sign Out
              </Button>
            </>
          ) : (
            <Button variant="contained" onClick={signIn}>
              Connect Wallet
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
