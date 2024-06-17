import React from 'react';
import { getApplicableTaxes } from '@opencollective/taxes';
import { cva } from 'class-variance-authority';
import { Markup } from 'interweave';
import { merge, pick } from 'lodash';
import { ArrowRight } from 'lucide-react';
import { FormattedMessage } from 'react-intl';

import { getPrecisionFromAmount, graphqlAmountValueInCents } from '../../lib/currency-utils';
import { isPastEvent } from '../../lib/events';
import { TierFrequency } from '../../lib/graphql/types/v2/graphql';
import useLoggedInUser from '../../lib/hooks/useLoggedInUser';
import { isTierExpired } from '../../lib/tier-utils';

import Avatar, { StackedAvatars } from '../Avatar';
import FormattedMoneyAmount from '../FormattedMoneyAmount';
import Link from '../Link';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';

import { Tabs } from './Tabs';

const canContribute = (collective, LoggedInUser) => {
  if (!collective.isActive) {
    return false;
  } else if (collective.type === 'EVENT') {
    return !isPastEvent(collective) || Boolean(LoggedInUser.isAdminOfCollectiveOrHost(collective));
  } else {
    return true;
  }
};
const aggregateGoalAmounts = goals => {
  const totalAmount = goals.reduce((acc, goal) => acc + goal.amount, 0);
  return { amount: totalAmount };
};

const Tiers = ({ account }) => {
  const LoggedInUser = useLoggedInUser();

  return (
    <div className="space-y-4">
      {account.tiers.nodes.map(tier => {
        const isFlexibleAmount = tier.amountType === 'FLEXIBLE';
        const minAmount = isFlexibleAmount ? tier.minimumAmount : tier.amount;
        const tierIsExpired = isTierExpired(tier);
        const canContributeToCollective = canContribute(account, LoggedInUser);
        const hasNoneLeft = tier.availableQuantity === 0;
        const currency = tier.currency || account.currency;
        const isDisabled = !canContributeToCollective || tierIsExpired || hasNoneLeft;
        const taxes = getApplicableTaxes(account, account.host, tier.type);

        return (
          <div key={tier.id} className="space-y-2 rounded-lg border p-4">
            <div className="text-balance text-lg font-semibold">{tier.name}</div>
            <div className="text-sm">{tier.description}</div>
            {!isDisabled && graphqlAmountValueInCents(minAmount) > 0 && (
              <div className="mt-3 text-muted-foreground">
                {isFlexibleAmount && (
                  <span className="block text-sm">
                    <FormattedMessage id="ContributeTier.StartsAt" defaultMessage="Starts at" />
                  </span>
                )}

                <div className="flex min-h-[36px] flex-col">
                  <span data-cy="amount">
                    <FormattedMoneyAmount
                      amount={graphqlAmountValueInCents(minAmount)}
                      frequency={tier.frequency && tier.frequency !== TierFrequency.FLEXIBLE ? tier.frequency : null}
                      currency={currency}
                      amountStyles={{ fontSize: '24px', lineHeight: '22px', fontWeight: 'bold', color: 'black.900' }}
                      precision={getPrecisionFromAmount(graphqlAmountValueInCents(minAmount))}
                    />
                    {taxes.length > 0 && ' *'}
                  </span>
                  {taxes.length > 0 && (
                    <span className="text-xs">
                      *{' '}
                      {taxes.length > 1 ? (
                        <FormattedMessage id="ContributeTier.Taxes" defaultMessage="Taxes may apply" />
                      ) : (
                        <FormattedMessage
                          defaultMessage="{taxName} may apply"
                          id="N9TNT7"
                          values={{ taxName: taxes[0].type }}
                        />
                      )}
                    </span>
                  )}
                </div>
              </div>
            )}
            <Button>{tier.button || <FormattedMessage defaultMessage="Contribute" id="Contribute" />}</Button>
          </div>
        );
      })}
    </div>
  );
};

// Naive implementation of Goals for prototype
const Goals = ({ account }) => {
  const {
    stats,
    financialContributors,
    currency,
    settings: { goals },
  } = account;
  const hasYearlyGoal = goals?.find(g => g.type === 'yearlyBudget');
  const hasMonthlyGoal = goals?.find(g => g.type === 'monthlyBudget');
  const currentAmount = hasYearlyGoal
    ? stats.yearlyBudget
    : hasMonthlyGoal
      ? stats.monthlyBudget
      : stats.totalAmountReceived;

  let goalTarget;
  if (hasYearlyGoal || hasMonthlyGoal) {
    goalTarget = aggregateGoalAmounts(goals);
  }
  const percentage = Math.round(goalTarget ? (currentAmount.valueInCents / goalTarget.amount) * 100 : 0);

  return (
    <div className="flex flex-col gap-4 text-muted-foreground">
      {goalTarget && <Progress value={percentage} />}
      <div>
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-end gap-4">
            {goalTarget ? (
              <span className="text-3xl font-bold text-primary">{percentage}%</span>
            ) : (
              <div>
                <span className="text-3xl font-bold text-primary">
                  <FormattedMoneyAmount
                    amount={currentAmount.valueInCents}
                    currency={currentAmount.currency}
                    showCurrencyCode={true}
                    amountStyles={{ letterSpacing: 0 }}
                    precision={0}
                  />
                </span>
                <div className="">raised</div>
              </div>
            )}
          </div>
        </div>
        {goalTarget && (
          <div className="">
            towards{' '}
            <FormattedMoneyAmount
              amount={goalTarget.amount}
              currency={currency}
              showCurrencyCode={false}
              amountStyles={{ letterSpacing: 0 }}
              precision={0}
            />{' '}
            {hasYearlyGoal ? <span>per year</span> : hasMonthlyGoal && <span>per month</span>} goal
          </div>
        )}
      </div>
      <div>
        <div className="text-3xl font-bold">{stats.contributorsCount}</div> <div>contributors</div>
      </div>
      <div>
        <StackedAvatars imageSize={32} accounts={financialContributors.nodes} maxDisplayedAvatars={6} />
      </div>
    </div>
  );
};

const ContentOverview = ({ content }) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');
  const headings = doc.querySelectorAll('h3');
  const headingTexts = Array.from(headings).map(h3 => h3.textContent?.trim() || '');
  const linkClasses = cva('px-2 font-semibold block hover:text-primary text-sm border-l-[3px]', {
    variants: {
      active: {
        true: 'border-primary/70',
        false: 'border-transparent',
      },
    },
    defaultVariants: {
      active: false,
    },
  });

  return (
    <div className="space-y-4">
      <Link href="#" className={linkClasses({ active: true })}>
        About
      </Link>
      {headingTexts.map(heading => (
        <Link href="#" key={heading} className={linkClasses()}>
          {heading}
        </Link>
      ))}
    </div>
  );
};

export default function Fundraiser(props) {
  const account = props.account;

  const title = account.parent ? account.name : `Support ${account.name}`;
  const mainAccount = account.parent || account;
  return (
    <React.Fragment>
      <div className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between">
          <Link href={`/preview/${account.parent?.slug || account.slug}`}>
            <Avatar className="" collective={account.parent || account} />
          </Link>
        </div>
      </div>
      <div className="">
        <div className="mx-auto max-w-screen-xl space-y-8 py-12">
          <div className="space-y-4 text-center">
            <h1 className="text-balance text-4xl font-semibold">{title}</h1>
            <p className="text-lg">{account.description}</p>
          </div>

          <div className="flex grow gap-8">
            {/* main */}
            <div className="w-full max-w-[900px] grow space-y-4">
              <div className="relative h-96 w-full overflow-hidden rounded-lg bg-primary/20">
                {account.backgroundImageUrl && (
                  <img src={account.backgroundImageUrl} alt="background" className="h-full w-full object-cover" />
                )}
              </div>

              <p>
                {' '}
                {account.type === 'EVENT' ? 'Event' : 'Fundraiser'} by{' '}
                <Link className="font-semibold text-primary hover:underline" href={`/preview/${mainAccount.slug}`}>
                  {mainAccount.name} <ArrowRight className="inline align-middle" size={16} />
                </Link>
              </p>
            </div>

            {/* sidebar */}
            <div className="w-full max-w-[420px] space-y-4">
              <Goals account={account} />

              <Button className="w-full" size="xl">
                <FormattedMessage defaultMessage="Contribute" id="Contribute" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-10 border-b border-t bg-background">
        <div className="relative mx-auto -mb-px h-16 max-w-screen-xl">
          <Tabs centered={false} tabs={['Fundraiser', 'Updates', 'Expenses']} />
        </div>
      </div>
      <div className="flex-1 bg-background">
        <div className="relative mx-auto grid max-w-screen-xl grid-cols-12 gap-8 py-12">
          <div className="col-span-2">
            <div className="sticky top-28 space-y-4">
              <ContentOverview content={account.longDescription} />
            </div>
          </div>

          <div className="prose prose-slate col-span-7">
            <h2>About</h2>
            <Markup
              noWrap
              content={account.longDescription}
              allowAttributes
              transform={node => {
                // Allow some iframes
                const attrs = [].slice.call(node.attributes);
                if (node.tagName === 'iframe') {
                  const src = node.getAttribute('src');
                  const parsedUrl = new URL(src);
                  const hostname = parsedUrl.hostname;
                  if (['youtube-nocookie.com', 'www.youtube-nocookie.com', 'anchor.fm'].includes(hostname)) {
                    const attributes = merge({}, ...attrs.map(({ name, value }) => ({ [name]: value })));
                    return (
                      <iframe
                        {...pick(attributes, ['width', 'height', 'frameborder', 'allowfullscreen'])}
                        title={attributes.title || 'Embed content'}
                        src={src}
                      />
                    );
                  }
                } else if (node.tagName === 'a') {
                  // Open links in new tab
                  node.setAttribute('target', '_blank');
                  node.setAttribute('rel', 'noopener noreferrer');
                }
              }}
            />
          </div>
          <div className="col-span-3">{account.tiers && <Tiers account={account} />}</div>
        </div>
      </div>
    </React.Fragment>
  );
}