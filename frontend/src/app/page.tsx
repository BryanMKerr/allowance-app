"use client";

import React from "react";
import { Box } from "@mui/material";
import Navbar from "@/components/Navbar";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
      }}
    >
      <Navbar />
      <Dashboard />
    </Box>
  );
}
