import React from 'react';
import { gql, useQuery } from '@apollo/client';
import { get } from 'lodash';
import { ExternalLink } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

import { checkIfOCF } from '../lib/collective';
import { API_V2_CONTEXT } from '../lib/graphql/helpers';
import { Account, OcfTransitionBannerQuery, OcfTransitionBannerQueryVariables } from '../lib/graphql/types/v2/graphql';
import useLoggedInUser from '../lib/hooks/useLoggedInUser';
import { getCollectivePageRoute, getDashboardRoute } from '../lib/url-helpers';
import { cn } from '../lib/utils';

import { Button } from './ui/Button';
import Link from './Link';
import LinkCollective from './LinkCollective';
import MessageBox from './MessageBox';
import MessageBoxGraphqlError from './MessageBoxGraphqlError';
import StyledLink from './StyledLink';

const OCFPublicBannerMessage = ({ collective, newAccount, isSimplified }) => {
  if (newAccount) {
    return (
      <React.Fragment>
        To contribute, please visit its new profile at{' '}
        <StyledLink as={LinkCollective} collective={newAccount}>
          @{newAccount.slug}
        </StyledLink>
        {!isSimplified && '. You can still submit expenses and access the transaction history of this account.'}
      </React.Fragment>
    );
  } else {
    return (
      <React.Fragment>
        {collective.name} cannot receive contributions at the moment. This page will be updated with more information
        once the collective transitions to a new Fiscal Host.
      </React.Fragment>
    );
  }
};

const OCFCollectiveAdminsBannerMessage = ({ account, newAccount, isCentered, hideNextSteps }) => {
  return (
    <React.Fragment>
      <div className="flex flex-col gap-3">
        <p className="text-lg font-semibold"></p>
        <div className="text-sm">
          {newAccount && (
            <React.Fragment>
              {newAccount.name} now operates under{' '}
              <StyledLink as={LinkCollective} collective={newAccount}>
                @{newAccount.slug}
              </StyledLink>
              {'. '}
            </React.Fragment>
          )}
          This account is not able to receive contributions. You can zero-out its balance by doing any of the following:
          <ul className={cn('list-outside list-disc pl-4', isCentered && 'mx-auto max-w-[600px] text-left')}>
            <li className="mt-1 text-neutral-700">
              <Link href={`${getCollectivePageRoute(account)}/expenses/new`}>
                <span className="underline">Submit expenses</span>{' '}
                <ExternalLink size={16} className="inline align-text-top" />
              </Link>
            </li>
            <li className="mt-1">
              <Link href={getDashboardRoute(account, 'advanced')}>
                <span className="underline">
                  Transfer your balance to Open Collective Foundation (Your current host)
                </span>{' '}
                <ExternalLink size={16} className="inline align-text-top" />
              </Link>
              <p className="font-normal">
                Choose this option if you have an agreement with OCF to transfer your funds to your new Fiscal Host.
              </p>
            </li>
          </ul>
        </div>
        {!hideNextSteps && !newAccount && (
          <div className={cn('mt-3 flex items-center gap-3', isCentered && 'justify-center')}>
            <div>Next Steps:</div>
            <Link href={getDashboardRoute(account, 'host')}>
              <Button variant="outline">
                <FormattedMessage id="AdminPanel.FiscalHostSettings" defaultMessage="Fiscal Host Settings" />
              </Button>
            </Link>
          </div>
        )}
      </div>
    </React.Fragment>
  );
};

export const getOCFBannerMessage = ({
  isAdmin,
  account,
  newAccount,
  hideNextSteps,
  isCentered = false,
  isSimplified = false,
}): {
  title: string;
  severity: 'error' | 'warning';
  message: React.ReactNode;
} => {
  if (!isAdmin) {
    return {
      title: `${account.name} is transitioning to a new Fiscal Host`,
      severity: 'error',
      message: <OCFPublicBannerMessage collective={account} newAccount={newAccount} isSimplified={isSimplified} />,
    };
  } else {
    return {
      title: newAccount
        ? 'This is a limited account. Spend your remaining balance.'
        : 'Your Fiscal Host Open Collective Foundation is closing down',
      severity: 'error',
      message: (
        <OCFCollectiveAdminsBannerMessage
          account={account}
          newAccount={newAccount}
          isCentered={isCentered}
          hideNextSteps={hideNextSteps}
        />
      ),
    };
  }
};

type OCFBannerProps = {
  collective: Pick<Account, 'slug'>;
  hideNextSteps?: boolean;
  isSimplified?: boolean;
};

export function OCFBannerWithData(props: OCFBannerProps) {
  const { LoggedInUser } = useLoggedInUser();
  const query = useQuery<OcfTransitionBannerQuery, OcfTransitionBannerQueryVariables>(
    gql`
      query OCFTransitionBanner($slug: String!) {
        account(slug: $slug) {
          id
          name
          slug
          ... on AccountWithHost {
            host {
              id
              legacyId
            }
          }
          duplicatedFromAccount {
            id
            name
            slug
            imageUrl
            ... on AccountWithHost {
              host {
                id
                legacyId
              }
            }
          }
          newAccounts: duplicatedAccounts(limit: 1) {
            totalCount
            nodes {
              id
              name
              slug
              imageUrl
              ... on AccountWithHost {
                host {
                  id
                  legacyId
                }
              }
            }
          }
        }
      }
    `,
    {
      variables: {
        slug: props.collective?.slug,
      },
      skip: !props.collective?.slug,
      context: API_V2_CONTEXT,
    },
  );

  const account = query.data?.account;
  const host = account && 'host' in account ? account.host : null;

  const isOCFHostedAccount = checkIfOCF(host);
  const newAccount = get(query, 'data.account.newAccounts.nodes.[0]', null);
  const oldAccount = get(query, 'data.account.duplicatedFromAccount', null);

  const params = new URLSearchParams();
  params.append('collectiveSlug', account?.slug);
  params.append('userSlug', LoggedInUser?.collective?.slug);

  if (query.loading) {
    return null;
  }

  if (query.error) {
    return <MessageBoxGraphqlError error={query.error} />;
  }

  if (isOCFHostedAccount) {
    const { title, severity, message } = getOCFBannerMessage({
      isAdmin: LoggedInUser?.isAdminOfCollective(account),
      account,
      newAccount,
      hideNextSteps: props.hideNextSteps,
      isSimplified: props.isSimplified,
    });

    return (
      <MessageBox type={severity} className="mb-4">
        <div className="flex flex-col gap-3">
          <div className="text-lg font-semibold">{title}</div>
          <div className="text-sm">{message}</div>
        </div>
      </MessageBox>
    );
  } else if (checkIfOCF(oldAccount?.host) && !checkIfOCF(newAccount?.host)) {
    return (
      <MessageBox type="warning" className="mb-4">
        <div className="flex flex-col gap-3">
          <p className="text-lg font-semibold">Reminder: You have an account pending to close.</p>
          <p className="text-sm">
            The remaining balance from your previous Fiscal Host is in this account:{' '}
            <StyledLink as={LinkCollective} collective={oldAccount}>
              @{oldAccount.slug}
            </StyledLink>
            . Is not able to receive contributions, you should zero-out this account soon.
          </p>
        </div>
      </MessageBox>
    );
  }

  return null;
}
