"use client";

import React from "react";
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";

const DAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

interface TransferDayPickerProps {
  value: number;
  onChange: (day: number) => void;
  disabled?: boolean;
}

export default function TransferDayPicker({
  value,
  onChange,
  disabled = false,
}: TransferDayPickerProps) {
  const handleChange = (e: SelectChangeEvent<number>) => {
    onChange(Number(e.target.value));
  };

  return (
    <FormControl fullWidth size="small">
      <InputLabel id="transfer-day-label">Payment Day</InputLabel>
      <Select
        labelId="transfer-day-label"
        value={value}
        label="Payment Day"
        onChange={handleChange}
        disabled={disabled}
      >
        {DAYS.map((d) => (
          <MenuItem key={d.value} value={d.value}>
            {d.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
