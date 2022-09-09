// SPDX-License-Identifier: Apache-2.0
pragma solidity >=0.6.0 <0.9.0;
pragma experimental ABIEncoderV2;

import "./hts-precompile/IHederaTokenService.sol";
import "./hts-precompile/HederaResponseCodes.sol";
import "./hts-precompile/HederaTokenService.sol";
import "./hts-precompile/ExpiryHelper.sol";

contract TokenCreator is ExpiryHelper{

function createNft(
            string memory name, 
            string memory symbol, 
            string memory memo, 
            uint32 maxSupply,
            uint32 autoRenewPeriod,
            bytes memory inED25519Key
        ) external payable returns (address){

        // Instantiate the list of keys we'll use for token create
        IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](2);
        
        // Use the helper methods in KeyHelper to create basic key
        keys[0] = createSingleKey(HederaTokenService.ADMIN_KEY_TYPE, KeyHelper.CONTRACT_ID_KEY, address(this));
        keys[1] = createSingleKey(HederaTokenService.SUPPLY_KEY_TYPE, KeyHelper.ED25519_KEY, inED25519Key);
        // keys[1] = createSingleKey(HederaTokenService.SUPPLY_KEY_TYPE, KeyHelper.INHERIT_ACCOUNT_KEY, msg.sender);

        // Instantiate the token
        IHederaTokenService.HederaToken memory token;
        token.name = name;
        token.symbol = symbol;
        token.memo = memo;
        token.treasury = address(this);
        token.tokenSupplyType = true; // set supply to FINITE
        token.tokenKeys = keys;
        token.maxSupply = maxSupply;
        token.freezeDefault = false;
        token.expiry = createAutoRenewExpiry(address(this), autoRenewPeriod);

        (int responseCode, address createdToken) = HederaTokenService.createNonFungibleToken(token);

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