import React from 'react';
import PropTypes from 'prop-types';
import { useQuery } from '@apollo/client';
import { omitBy } from 'lodash';
import { useRouter } from 'next/router';
import { FormattedMessage, useIntl } from 'react-intl';

import { API_V2_CONTEXT } from '../../../lib/graphql/helpers';

import DashboardViews from '../../dashboard/DashboardViews';
import HostApplicationDrawer from '../../dashboard/sections/collectives/HostApplicationDrawer';
import HostApplicationsTable from '../../dashboard/sections/collectives/HostApplicationsTable';
import { hostApplicationsMetadataQuery, hostApplicationsQuery } from '../../dashboard/sections/collectives/queries';
import { Box } from '../../Grid';
import MessageBoxGraphqlError from '../../MessageBoxGraphqlError';
import Pagination from '../../Pagination';
import SearchBar from '../../SearchBar';
import HostAdminCollectiveFilters, { COLLECTIVE_FILTER } from '../HostAdminCollectiveFilters';

const COLLECTIVES_PER_PAGE = 20;

const getVariablesFromQuery = query => {
  return {
    offset: parseInt(query.offset) || 0,
    limit: parseInt(query.limit) || COLLECTIVES_PER_PAGE,
    searchTerm: query.searchTerm,
    hostFeesStructure: query['fees-structure'],
    status: query.status,
    orderBy: {
      field: 'CREATED_AT',
      direction: query['sort-by'] === 'oldest' ? 'ASC' : 'DESC',
    },
  };
};

const ROUTE_PARAMS = ['hostCollectiveSlug', 'slug', 'section', 'view'];

const updateQuery = (router, newParams) => {
  const query = omitBy({ ...router.query, ...newParams }, (value, key) => !value || ROUTE_PARAMS.includes(key));
  const pathname = router.asPath.split('?')[0].split('#')[0];
  return router.push({ pathname, query });
};

const enforceDefaultParamsOnQuery = query => {
  return {
    ...query,
    status: query.status || 'PENDING',
  };
};

const HostApplications = ({ accountSlug: hostSlug }) => {
  const router = useRouter() || {};
  const intl = useIntl();
  const query = enforceDefaultParamsOnQuery(router.query);
  const { data: metadata } = useQuery(hostApplicationsMetadataQuery, {
    variables: { hostSlug },
    fetchPolicy: 'cache-and-network',
    context: API_V2_CONTEXT,
  });

  const views = [
    {
      label: intl.formatMessage({ defaultMessage: 'Pending' }),
      query: {
        status: 'PENDING',
      },
      id: 'pending',
      count: metadata?.host?.pending.totalCount,
    },
    {
      label: intl.formatMessage({ defaultMessage: 'Approved' }),
      query: { status: 'APPROVED' },
      id: 'approved',
      count: metadata?.host?.approved.totalCount,
    },
    {
      label: intl.formatMessage({ defaultMessage: 'Rejected' }),
      query: { status: 'REJECTED' },
      showCount: true,
      id: 'rejected',
      count: metadata?.host?.rejected.totalCount,
    },
  ];

  const { data, error, loading, variables } = useQuery(hostApplicationsQuery, {
    variables: { hostSlug, ...getVariablesFromQuery(query) },
    fetchPolicy: 'cache-and-network',
    context: API_V2_CONTEXT,
  });

  // Open application account id, checking hash for backwards compatibility
  const accountId = Number(router.query.accountId || window?.location.hash.split('application-')[1]);
  const [applicationInDrawer, setApplicationInDrawer] = React.useState(null);
  const drawerOpen = accountId && applicationInDrawer;

  React.useEffect(() => {
    if (accountId) {
      const application = data?.host?.hostApplications?.nodes?.find(a => a.account.legacyId === accountId);
      if (application) {
        setApplicationInDrawer(application);
      }
    }
  }, [accountId, data?.host?.hostApplications]);

  const pageRoute = `/${hostSlug}/admin/host-applications`;
  const hostApplications = data?.host?.hostApplications;

  return (
    <Box maxWidth={1024} m="0 auto">
      <div className="mb-4 flex flex-wrap justify-between gap-4">
        <h1 className="text-2xl font-bold leading-10 tracking-tight">
          <FormattedMessage id="Menu.HostApplications" defaultMessage="Host Applications" />
        </h1>
        <div className="w-[276px]">
          <SearchBar
            height={40}
            defaultValue={query.searchTerm}
            onSubmit={searchTerm => updateQuery(router, { searchTerm, offset: null })}
          />
        </div>
      </div>

      <DashboardViews
        query={query}
        omitMatchingParams={[...ROUTE_PARAMS, 'orderBy', 'accountId']}
        views={views}
        onChange={query => {
          router.push(
            {
              pathname: pageRoute,
              query,
            },
            undefined,
            { scroll: false },
          );
        }}
      />
      <div className="mb-6">
        <HostAdminCollectiveFilters
          filters={[COLLECTIVE_FILTER.SORT_BY]}
          values={query}
          onChange={queryParams =>
            updateQuery(router, {
              ...queryParams,
              offset: null,
            })
          }
        />
      </div>

      {error && <MessageBoxGraphqlError error={error} mb={2} />}

      <HostApplicationsTable
        hostApplications={hostApplications}
        nbPlaceholders={COLLECTIVES_PER_PAGE}
        loading={loading}
        openApplication={application => updateQuery(router, { accountId: application.account.legacyId })}
      />

      <div className="mt-16 flex justify-center">
        <Pagination
          total={hostApplications?.totalCount}
          limit={variables.limit}
          offset={variables.offset}
          ignoredQueryParams={ROUTE_PARAMS}
        />
      </div>

      <HostApplicationDrawer
        open={drawerOpen}
        onClose={() => updateQuery(router, { accountId: null })}
        host={metadata?.host}
        application={applicationInDrawer}
      />
    </Box>
  );
};

HostApplications.propTypes = {
  accountSlug: PropTypes.string.isRequired,
  isDashboard: PropTypes.bool,
};

export default HostApplications;
