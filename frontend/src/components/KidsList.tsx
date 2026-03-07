"use client";

import React from "react";
import {
  Card,
  CardContent,
  Typography,
  Box,
  IconButton,
  Chip,
  Tooltip,
  Avatar,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import PersonIcon from "@mui/icons-material/Person";
import type { Kid } from "@/lib/types";
import { formatUSDC, truncateAddress } from "@/lib/utils";

// Deterministic color palette for kid avatars
const AVATAR_COLORS = [
  "#1a237e",
  "#0d47a1",
  "#006064",
  "#1b5e20",
  "#e65100",
  "#4a148c",
  "#880e4f",
  "#bf360c",
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface KidsListProps {
  kids: Kid[];
  onEdit: (kid: Kid) => void;
  onRemove: (walletId: string) => void;
  disabled: boolean;
}

export default function KidsList({
  kids,
  onEdit,
  onRemove,
  disabled,
}: KidsListProps) {
  if (kids.length === 0) {
    return (
      <Card>
        <CardContent
          sx={{
            textAlign: "center",
            py: 5,
          }}
        >
          <PersonIcon
            sx={{ fontSize: 48, color: "grey.300", mb: 1 }}
          />
          <Typography color="text.secondary">
            No recipients added yet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add a kid to get started with automatic allowance payments.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {kids.map((kid) => (
        <Card
          key={kid.wallet_id}
          sx={{
            opacity: kid.active ? 1 : 0.6,
            transition: "all 0.2s ease",
            "&:hover": {
              boxShadow:
                "0 4px 12px rgba(0,0,0,0.1), 0 2px 4px rgba(0,0,0,0.06)",
            },
          }}
        >
          <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Avatar
                  sx={{
                    bgcolor: getAvatarColor(kid.name),
                    width: 44,
                    height: 44,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                  }}
                >
                  {kid.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {kid.name}
                    </Typography>
                    {!kid.active && (
                      <Chip
                        label="Inactive"
                        size="small"
                        color="default"
                        sx={{ height: 20, fontSize: "0.7rem" }}
                      />
                    )}
                  </Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontFamily: "monospace", fontSize: "0.8rem" }}
                  >
                    {truncateAddress(kid.wallet_id)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 700,
                    color: "primary.main",
                    mr: 1,
                  }}
                >
                  {formatUSDC(kid.amount)}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mr: 1 }}
                >
                  /week
                </Typography>

                <Tooltip title="Edit amount">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onEdit(kid)}
                      disabled={disabled}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
                <Tooltip title="Remove">
                  <span>
                    <IconButton
                      size="small"
                      onClick={() => onRemove(kid.wallet_id)}
                      disabled={disabled}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
