"use client";

import React, { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  CircularProgress,
} from "@mui/material";
import SettingsIcon from "@mui/icons-material/Settings";
import SaveIcon from "@mui/icons-material/Save";
import TransferDayPicker from "./TransferDayPicker";

interface SettingsCardProps {
  currentDay: number;
  onSave: (day: number) => Promise<void>;
  loading: boolean;
  disabled: boolean;
}

export default function SettingsCard({
  currentDay,
  onSave,
  loading,
  disabled,
}: SettingsCardProps) {
  const [selectedDay, setSelectedDay] = useState(currentDay);
  const [hasChanged, setHasChanged] = useState(false);

  const handleChange = useCallback(
    (day: number) => {
      setSelectedDay(day);
      setHasChanged(day !== currentDay);
    },
    [currentDay]
  );

  const handleSave = useCallback(async () => {
    await onSave(selectedDay);
    setHasChanged(false);
  }, [onSave, selectedDay]);

  // Sync when props change
  React.useEffect(() => {
    setSelectedDay(currentDay);
    setHasChanged(false);
  }, [currentDay]);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <SettingsIcon color="primary" fontSize="small" />
          <Typography variant="h6" sx={{ fontSize: "1rem" }}>
            Payment Settings
          </Typography>
        </Box>

        <TransferDayPicker
          value={selectedDay}
          onChange={handleChange}
          disabled={disabled || loading}
        />

        <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="contained"
            size="small"
            onClick={handleSave}
            disabled={!hasChanged || loading || disabled}
            startIcon={
              loading ? <CircularProgress size={16} /> : <SaveIcon />
            }
          >
            {loading ? "Saving..." : "Save"}
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}
