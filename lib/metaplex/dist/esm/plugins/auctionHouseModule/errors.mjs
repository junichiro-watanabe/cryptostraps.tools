import { MetaplexError } from '../../errors/MetaplexError.mjs';

class AuctionHouseError extends MetaplexError {
  constructor(input) {
    super({ ...input,
      key: `plugin.auction_house.${input.key}`,
      title: `AuctionHouse > ${input.title}`,
      source: 'plugin',
      sourceDetails: 'AuctionHouse'
    });
  }

}
class TreasuryDestinationOwnerRequiredError extends AuctionHouseError {
  constructor(cause) {
    super({
      cause,
      key: 'treasury_destination_owner_required',
      title: 'Treasury Destination Owner Required',
      problem: 'You are trying to update an Auction House which uses a custom token as a treasury. ' + 'You have not provided the "treasuryWithdrawalDestinationOwner" because you do not wish to change it. ' + 'However, the Auction House account does not keep track of that information so we cannot prefill that for you. ' + 'Thus, if you wish to keep the same treasury withdrawal, you must provide it explicilty.',
      solution: 'Please provide the current "treasuryWithdrawalDestinationOwner" parameter so you can update the other fields.' + 'Note that we keep that parameter optional because no Associate Token Account is needed for Auction Houses ' + 'whose treasury is the native SOL.'
    });
  }

}

export { AuctionHouseError, TreasuryDestinationOwnerRequiredError };
//# sourceMappingURL=errors.mjs.map
