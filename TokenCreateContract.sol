// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./hts-precompile/IHederaTokenService.sol";
import "./hts-precompile/HederaResponseCodes.sol";
import "./hts-precompile/HederaTokenService.sol";
import "./hts-precompile/ExpiryHelper.sol";

contract TokenCreator is ExpiryHelper{

function createNft(
            string memory _name, 
            string memory _symbol, 
            string memory _memo, 
            uint32 _maxSupply,
            uint32 _autoRenewPeriod,
            bytes memory _inED25519Key,
            uint32 _numerator,
            uint32 _denominator,
            uint32 _fallback,
            address _feeCollector

        ) external payable returns (address){

        // Instantiate the list of keys and custom fees to use for token create
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](2);
        IHederaTokenService.RoyaltyFee[] memory royalties = new IHederaTokenService.RoyaltyFee[](1);
        
        // Use the helper methods in KeyHelper to create keys
        keys[0] = createSingleKey(HederaTokenService.ADMIN_KEY_TYPE, KeyHelper.CONTRACT_ID_KEY, address(this));
        keys[1] = createSingleKey(HederaTokenService.SUPPLY_KEY_TYPE, KeyHelper.ED25519_KEY, _inED25519Key);
        // keys[1] = createSingleKey(HederaTokenService.SUPPLY_KEY_TYPE, KeyHelper.INHERIT_ACCOUNT_KEY, msg.sender);

        // Use the helper methods in FeeHelper to create custom royalty fees
        royalties[0] = createRoyaltyFeeWithHbarFallbackFee(_numerator, _denominator, _fallback, _feeCollector);

        // Instantiate the token
        IHederaTokenService.HederaToken memory token;
        token.name = _name;
        token.symbol = _symbol;
        token.memo = _memo;
        token.treasury = address(this);
        token.tokenSupplyType = true; // set supply to FINITE
        token.tokenKeys = keys;
        token.maxSupply = _maxSupply;
        token.freezeDefault = false;
        token.expiry = createAutoRenewExpiry(address(this), _autoRenewPeriod);

        (int responseCode, address createdToken) = 
            HederaTokenService.createNonFungibleTokenWithCustomFees(
                token, 
                new IHederaTokenService.FixedFee[](0),
                royalties
            );

        if(responseCode != HederaResponseCodes.SUCCESS){
            revert("Failed to create non-fungible token");
        }
        return createdToken;
    }

    function mintNft(address _tokenAddress, bytes[] memory _metadata) external {
        (int response, uint64 newTotalSupply, int64[] memory serialNumbers) = HederaTokenService.mintToken(_tokenAddress, uint64(0), _metadata);
            
        if (response != HederaResponseCodes.SUCCESS) {
            revert ("Mint Failed");
        }
    }

    function sendNft(address _tokenAddress, address _receiver, int64 _serialNumber, address _author) external payable {

        require(msg.value > 250000000,"Send more HBAR");

        // int assoResponse = HederaTokenService.associateToken(_receiver, _tokenAddress);
        int sendResponse = HederaTokenService.transferNFT(_tokenAddress, address(this) , _receiver, _serialNumber);
        if (sendResponse != HederaResponseCodes.SUCCESS) {
            revert ("NFT Transfer Failed");
        }
        
        (bool sent, ) = _author.call{value:msg.value/2}("");
        require(sent, "Failed to send Hbar");

    

    }
}