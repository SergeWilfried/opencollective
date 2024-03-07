import React from 'react';

import CollectivePickerAsync from '../CollectivePickerAsync';
import ActivityLog from '../dashboard/sections/ActivityLog';
import { Box } from '../Grid';
import StyledInputField from '../StyledInputField';

const RootActivityLog = () => {
  const [account, setAccount] = React.useState(null);
  return (
    <Box my={4}>
      <StyledInputField htmlFor="activity-log-account" label="Account" flex="1 1">
        {({ id }) => (
          <CollectivePickerAsync
            inputId={id}
            onChange={({ value }) => setAccount(value)}
            collective={account}
            skipGuests={false}
          />
        )}
      </StyledInputField>
      {account && <ActivityLog accountSlug={account.slug} />}
    </Box>
  );
};

export default RootActivityLog;
