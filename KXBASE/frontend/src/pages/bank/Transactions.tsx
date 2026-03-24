import React from 'react';
import { Box, Typography, Alert } from '@mui/material';

const Transactions: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight="bold">
        交易记录
      </Typography>
      <Alert severity="info" sx={{ mt: 2 }}>
        交易记录功能正在迁移中，后续将由后端统一管理。
      </Alert>
    </Box>
  );
};

export default Transactions;
