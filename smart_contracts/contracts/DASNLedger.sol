// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DASNLedger {
    
    // The structure of our intelligence block
    struct IntelligenceReport {
        string anonymousId;
        string threatLevel;
        string timestamp;
        bool isAnchored;
    }

    // State Variables
    address public admin; // The Police Commander's Ethereum Address
    mapping(string => IntelligenceReport) public reports;
    mapping(string => int256) public reputationScores;

    // Events (These act as the "receipts" on the blockchain)
    event ReportAnchored(string anonymousId, string threatLevel, string timestamp);
    event ReputationUpdated(string anonymousId, int256 newScore);

    // Modifier to ensure ONLY the Police Commander can validate reports
    modifier onlyAdmin() {
        require(msg.sender == admin, "Unauthorized: Only Command Center can perform this action");
        _;
    }

    constructor() {
        admin = msg.sender; // The wallet that deploys this contract becomes the Admin
    }

    // 1. Anchor the AI data to the blockchain (Anyone/The System can do this)
    function anchorIntelligence(string memory _anonymousId, string memory _threatLevel, string memory _timestamp) public {
        require(!reports[_anonymousId].isAnchored, "Report already anchored");
        
        reports[_anonymousId] = IntelligenceReport(_anonymousId, _threatLevel, _timestamp, true);
        
        emit ReportAnchored(_anonymousId, _threatLevel, _timestamp);
    }

    // 2. The Reputable Score System (ONLY Admin can do this)
    function validateReport(string memory _anonymousId, bool _isValid) public onlyAdmin {
        require(reports[_anonymousId].isAnchored, "Cannot validate a non-existent report");

        if (_isValid) {
            reputationScores[_anonymousId] += 10; // Valid Intel
        } else {
            reputationScores[_anonymousId] -= 10; // Decoy/Noise
        }

        emit ReputationUpdated(_anonymousId, reputationScores[_anonymousId]);
    }

    // 3. Helper to fetch the score
    function getReputationScore(string memory _anonymousId) public view returns (int256) {
        return reputationScores[_anonymousId];
    }
}