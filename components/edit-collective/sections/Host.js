import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { get, groupBy } from 'lodash';
import { withRouter } from 'next/router';
import { FormattedDate, FormattedMessage, injectIntl } from 'react-intl';
import styled from 'styled-components';

import { formatCurrency } from '../../../lib/currency-utils';
import { getCollectivePageRoute, getDashboardRoute } from '../../../lib/url-helpers';
import { formatDate, getWebsiteUrl } from '../../../lib/utils';

import CollectiveCard from '../../CollectiveCard';
import Container from '../../Container';
import { Box, Flex } from '../../Grid';
import { getI18nLink } from '../../I18nFormatters';
import Link from '../../Link';
import MessageBox from '../../MessageBox';
import StyledButton from '../../StyledButton';
import StyledInput from '../../StyledInput';
import StyledLink from '../../StyledLink';
import StyledModal, { ModalBody, ModalFooter, ModalHeader } from '../../StyledModal';
import { H4, P } from '../../Text';
import CreateHostFormWithData from '../CreateHostFormWithData';
import EditConnectedAccount from '../EditConnectedAccount';
import { LeaveHostModal } from '../LeaveHostModal';

const OptionLabel = styled.label`
  display: block;
  font-weight: bold;
  cursor: pointer;
`;

const EditCollectiveHostSection = styled.div`
  h2 label {
    cursor: pointer;
    width: auto;
  }

  select {
    cursor: pointer;
  }
`;

class Host extends React.Component {
  static propTypes = {
    goals: PropTypes.arrayOf(PropTypes.object),
    collective: PropTypes.object.isRequired,
    LoggedInUser: PropTypes.object.isRequired,
    editCollectiveMutation: PropTypes.func.isRequired,
    router: PropTypes.object.isRequired, // from withRouter
    intl: PropTypes.object.isRequired, // from injectIntl
  };

  constructor(props) {
    super(props);
    this.changeHost = this.changeHost.bind(this);
    this.updateSelectedOption = this.updateSelectedOption.bind(this);
    this.state = {
      collective: props.collective,
      showModal: false,
      action: '',
      isSubmitting: false,
    };
  }

  updateSelectedOption(option) {
    this.props.router.push({
      pathname: `/dashboard/${this.props.collective.slug}/host`,
      query: {
        selectedOption: option,
      },
    });
  }

  async changeHost(newHost = { id: null }) {
    const { collective } = this.props;

    if (newHost.id === get(collective, 'host.id')) {
      return;
    }

    this.setState({ isSubmitting: true });
    try {
      await this.props.editCollectiveMutation({
        id: collective.id,
        HostCollectiveId: newHost.id,
      });
      if (!newHost.id) {
        this.updateSelectedOption('noHost');
      }
    } finally {
      this.setState({ isSubmitting: false, showModal: false });
    }
  }

  renderLegalNameSetInfoMessage(collective) {
    return (
      <MessageBox type="info" fontSize="13px" withIcon>
        <FormattedMessage
          id="collective.edit.host.legalName.info"
          defaultMessage="Please set the legal name {isSelfHosted, select, false {of the host} other {}} in the Info section of <SettingsLink>the settings</SettingsLink>. This is required if the legal name is different than the display name for tax and accounting purposes."
          values={{
            SettingsLink: getI18nLink({ href: `/dashboard/${collective.host?.slug}` }),
            isSelfHosted: collective.id === collective.host?.id,
          }}
        />
      </MessageBox>
    );
  }

  render() {
    const { LoggedInUser, collective, router, intl } = this.props;
    const { showModal, action } = this.state;
    const { locale } = intl;

    const selectedOption = get(router, 'query.selectedOption', 'noHost');
    const hostMembership = get(collective, 'members', []).find(m => m.role === 'HOST');

    const closeModal = () => this.setState({ showModal: false });
    const showLegalNameInfoBox = LoggedInUser?.isHostAdmin(collective) && !collective.host?.legalName;

    if (get(collective, 'host.id') === collective.id) {
      return (
        <div className="flex flex-col space-y-4">
          <p>
            <FormattedMessage
              id="editCollective.selfHost.label"
              defaultMessage="{type, select, COLLECTIVE {Your Collective} FUND {Your Fund} other {Your Account}} hold its own funds; it doesn't use a Fiscal Host."
              values={{
                type: collective.type,
              }}
            />
          </p>
          {collective.stats.balance > 0 && (
            <Fragment>
              <p>
                <FormattedMessage
                  id="editCollective.selfHost.balance"
                  defaultMessage="Current balance: {balance}."
                  values={{
                    balance: formatCurrency(collective.stats.balance, collective.currency, { locale }),
                    type: collective.type,
                  }}
                />{' '}
                <FormattedMessage
                  id="editCollective.selfHost.change.balanceNotEmpty"
                  defaultMessage="To change your Fiscal Host, you first need to empty {type, select, COLLECTIVE {your Collective's balance} FUND {your Fund's balance} other {your balance}} by submitting and paying expenses."
                  values={{
                    type: collective.type,
                  }}
                />
              </p>
            </Fragment>
          )}
          {showLegalNameInfoBox && <Container>{this.renderLegalNameSetInfoMessage(collective)}</Container>}
          {collective.stats.balance === 0 && (
            <Fragment>
              <p>
                <StyledButton
                  buttonStyle="primary"
                  type="submit"
                  onClick={() => this.changeHost()}
                  minWidth={200}
                  loading={this.state.isSubmitting}
                >
                  <FormattedMessage id="editCollective.selfHost.removeBtn" defaultMessage="Reset Fiscal Host" />
                </StyledButton>
              </p>
            </Fragment>
          )}
        </div>
      );
    }

    if (get(collective, 'host.id')) {
      const name = collective.host.name;
      return (
        <Fragment>
          <Flex flexDirection={['column', 'row']}>
            <Box p={1} mr={3}>
              <CollectiveCard
                collective={collective.host}
                membership={hostMembership}
                hideRoles={!collective.isActive}
              />
            </Box>
            <Box>
              {!collective.isActive && (
                <Fragment>
                  <p>
                    <FormattedMessage
                      id="editCollective.host.pending"
                      defaultMessage="You applied to be hosted by {host} on {date}. Your application is being reviewed."
                      values={{
                        host: get(collective, 'host.name'),
                        date: formatDate(get(hostMembership, 'createdAt'), {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        }),
                      }}
                    />
                  </p>
                  <p>
                    <StyledButton
                      buttonStyle="primary"
                      type="submit"
                      onClick={() => this.setState({ showModal: true, action: 'Withdraw' })}
                    >
                      <FormattedMessage
                        id="editCollective.host.cancelApplicationBtn"
                        defaultMessage="Withdraw application"
                      />
                    </StyledButton>
                  </p>
                </Fragment>
              )}
              {collective.isActive && (
                <Fragment>
                  <p className="mb-2 text-base font-bold">
                    <FormattedMessage
                      defaultMessage="Hosted by {host} since {approvedAt}"
                      values={{
                        host: (
                          <StyledLink as={Link} href={getCollectivePageRoute(collective.host)}>
                            {collective.host.name}
                          </StyledLink>
                        ),
                        approvedAt: <FormattedDate dateStyle="medium" value={collective.approvedAt} />,
                      }}
                    />
                    .
                  </p>
                  {collective.stats.balance > 0 && (
                    <p className="mb-2">
                      <FormattedMessage
                        id="editCollective.host.balance"
                        defaultMessage="It currently holds {balance} on behalf of {type, select, COLLECTIVE {your Collective} FUND {your Fund} other {your Account}}."
                        values={{
                          balance: (
                            <strong>{formatCurrency(collective.stats.balance, collective.currency, { locale })}</strong>
                          ),
                          type: collective.type,
                        }}
                      />
                    </p>
                  )}
                  {collective.stats.balance > 0 && (
                    <p>
                      <FormattedMessage
                        id="editCollective.host.change.balanceNotEmpty"
                        defaultMessage="To change your Fiscal Host, you first need to empty {type, select, COLLECTIVE {your Collective's balance} FUND {your Fund's balance} other {your balance}}. You can do this by <SubmitExpenseLink>submitting expenses</SubmitExpenseLink>, making financial contributions, or sending the balance to your Fiscal Host using the <EmptyBalanceLink>Empty Balance</EmptyBalanceLink> feature."
                        values={{
                          type: collective.type,
                          SubmitExpenseLink: getI18nLink({
                            as: Link,
                            href: `/${collective.slug}/expenses/new`,
                          }),
                          EmptyBalanceLink: getI18nLink({
                            as: Link,
                            href: getDashboardRoute(collective, 'advanced'),
                          }),
                        }}
                      />
                    </p>
                  )}
                  {collective.stats.balance === 0 && (
                    <div className="mt-2 flex">
                      <div>
                        <StyledButton
                          type="submit"
                          onClick={() => this.setState({ showModal: true, action: 'Remove' })}
                        >
                          <FormattedMessage id="editCollective.host.leave" defaultMessage="Leave Host" />
                        </StyledButton>
                      </div>
                    </div>
                  )}
                  {showLegalNameInfoBox && (
                    <Container mt={4}>{this.renderLegalNameSetInfoMessage(collective)}</Container>
                  )}
                </Fragment>
              )}
            </Box>
          </Flex>
          {showModal &&
            (action === 'Remove' ? (
              <LeaveHostModal account={collective} host={collective.host} onClose={closeModal} />
            ) : (
              <StyledModal width="570px" onClose={closeModal}>
                <ModalHeader onClose={closeModal}>
                  <FormattedMessage
                    id="collective.editHost.header"
                    values={{ name }}
                    defaultMessage={'Withdraw application to {name}'}
                  />
                </ModalHeader>
                <ModalBody>
                  <P>
                    <FormattedMessage
                      id="collective.editHost.withdrawApp"
                      values={{ name }}
                      defaultMessage="Are you sure you want to withdraw your application to {name}?"
                    />
                  </P>
                </ModalBody>
                <ModalFooter>
                  <Container display="flex" justifyContent="flex-end">
                    <StyledButton
                      mx={20}
                      onClick={() =>
                        this.setState({
                          showModal: false,
                          whatToDoWithRecurringContributions: null,
                        })
                      }
                    >
                      <FormattedMessage id="actions.cancel" defaultMessage="Cancel" />
                    </StyledButton>
                    <StyledButton
                      buttonStyle="primary"
                      loading={this.state.isSubmitting}
                      onClick={() => this.changeHost(null)}
                      data-cy="continue"
                    >
                      <FormattedMessage
                        id="collective.editHost.header"
                        values={{ name }}
                        defaultMessage="Withdraw application to {name}"
                      />
                    </StyledButton>
                  </Container>
                </ModalFooter>
              </StyledModal>
            ))}
        </Fragment>
      );
    }

    const connectedAccounts = groupBy(collective.connectedAccounts, 'service');
    const stripeAccount = connectedAccounts['stripe']?.[0];

    return (
      <EditCollectiveHostSection>
        <H4 fontSize="15px" mb={3}>
          <FormattedMessage
            id="acceptContributions.picker.subtitle"
            defaultMessage="Who will hold money on behalf of this Collective?"
          />
        </H4>
        <div id="noHost">
          <Flex>
            <Box flex="0 0 35px" mr={2} pl={2}>
              <StyledInput
                type="radio"
                name="host-radio"
                id="host-radio-noHost"
                checked={selectedOption === 'noHost'}
                onChange={() => this.updateSelectedOption('noHost')}
                className="hostRadio"
              />
            </Box>
            <Box mb={4}>
              <OptionLabel htmlFor="host-radio-noHost">
                <FormattedMessage defaultMessage="No one" />
              </OptionLabel>
              <FormattedMessage
                id="collective.edit.host.noHost.description"
                defaultMessage="You can't receive financial contributions or use the budget features. You can still edit your profile page, submit expenses to be paid later, and post updates."
              />
            </Box>
          </Flex>
        </div>

        <div id="selfHost">
          <Flex>
            <Box flex="0 0 35px" mr={2} pl={2}>
              <StyledInput
                type="radio"
                name="host-radio"
                id="host-radio-selfHost"
                checked={selectedOption === 'selfHost'}
                onChange={() => this.updateSelectedOption('selfHost')}
                className="hostRadio"
              />
            </Box>
            <Box mb={4}>
              <OptionLabel htmlFor="host-radio-selfHost">
                <FormattedMessage id="acceptContributions.picker.ourselves" defaultMessage="Independent Collective" />
              </OptionLabel>
              <FormattedMessage
                id="collective.edit.host.selfHost.description"
                defaultMessage="Simply connect a bank account for a single Collective. You will be responsible for accounting, taxes, payments, and liability."
              />
              &nbsp;
              <StyledLink href="https://docs.opencollective.com/help/independent-collectives" openInNewTab>
                <FormattedMessage id="moreInfo" defaultMessage="More info" />
              </StyledLink>
              {selectedOption === 'selfHost' && LoggedInUser && (
                <Flex
                  flexDirection={['column', 'row', 'row']}
                  justifyContent="space-between"
                  alignItems="flex-end"
                  mt={3}
                >
                  <Box mb={[3]}>
                    <StyledButton
                      buttonStyle="primary"
                      type="submit"
                      onClick={() => this.changeHost({ id: collective.id })}
                      loading={this.state.isSubmitting}
                      minWidth={200}
                    >
                      <FormattedMessage
                        id="host.selfHost.confirm"
                        defaultMessage="Yes, Activate Independent Collective"
                      />
                    </StyledButton>
                  </Box>
                  {!stripeAccount && (
                    <Box textAlign="right">
                      <EditConnectedAccount
                        collective={collective}
                        service="stripe"
                        options={{
                          redirect: `${getWebsiteUrl()}/dashboard/${collective.slug}/host?selectedOption=selfHost`,
                        }}
                      />
                    </Box>
                  )}
                </Flex>
              )}
            </Box>
          </Flex>
        </div>

        <div id="ownHost">
          <Flex>
            <Box flex="0 0 35px" mr={2} pl={2}>
              <StyledInput
                type="radio"
                id="host-radio-ownHost"
                name="host-radio"
                checked={selectedOption === 'ownHost'}
                onChange={() => this.updateSelectedOption('ownHost')}
                className="hostRadio"
              />
            </Box>
            <Box mb={4}>
              <OptionLabel htmlFor="host-radio-ownHost">
                <FormattedMessage id="acceptContributions.organization.subtitle" defaultMessage="Our Own Fiscal Host" />
              </OptionLabel>
              <FormattedMessage
                id="collective.edit.host.useOwn.description"
                defaultMessage="Select or create your own Fiscal Host, which you manage to hold funds for multiple Collectives, to hold funds and do associated admin for this Collective."
              />
              &nbsp;
              <StyledLink href="https://docs.opencollective.com/help/fiscal-hosts/become-a-fiscal-host" openInNewTab>
                <FormattedMessage id="moreInfo" defaultMessage="More info" />
              </StyledLink>
              {selectedOption === 'ownHost' && LoggedInUser && (
                <CreateHostFormWithData
                  collective={collective}
                  LoggedInUser={LoggedInUser}
                  onSubmit={hostCollective => this.changeHost(hostCollective)}
                />
              )}
            </Box>
          </Flex>
        </div>

        <div id="findHost">
          <Flex>
            <Box flex="0 0 35px" mr={2} pl={2}>
              <StyledInput
                type="radio"
                name="host-radio"
                id="host-radio-findHost"
                checked={selectedOption === 'findHost'}
                onChange={() => this.updateSelectedOption('findHost')}
                className="hostRadio"
              />
            </Box>
            <Box mb={4}>
              <OptionLabel htmlFor="host-radio-findHost">
                <FormattedMessage id="collective.edit.host.findHost.title" defaultMessage="Apply to a Fiscal Host" />
              </OptionLabel>
              <FormattedMessage
                id="collective.edit.host.findHost.description"
                defaultMessage="Join an existing Fiscal Host who will hold funds on your behalf and take care of accounting, taxes, banking, admin, payments, and liability. Most Hosts charge a fee for this service (you can review the details before choosing a Host)."
              />
              {selectedOption === 'findHost' && (
                <div>
                  <Container display="flex" alignItems="baseline" mt={2}>
                    <StyledLink
                      buttonStyle="primary"
                      buttonSize="medium"
                      as={Link}
                      fontSize="13px"
                      href={`${collective.slug}/accept-financial-contributions/host`}
                    >
                      <FormattedMessage defaultMessage="Choose a Fiscal Host" />
                    </StyledLink>
                  </Container>
                </div>
              )}
            </Box>
          </Flex>
        </div>
      </EditCollectiveHostSection>
    );
  }
}

export default withRouter(injectIntl(Host));
