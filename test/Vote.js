const { expect } = require("chai");
const { ethers } = require("hardhat");

let Voting_Factory;
let Voting;

const RegisteringVoters = 0;
const ProposalsRegistrationStarted = 1;
const ProposalsRegistrationEnded = 2;
const VotingSessionStarted = 3;
const VotingSessionEnded = 4;
const VotesTallied = 5;

describe("Test workflow", function () {
   beforeEach(async function () {
      [owner, voter1] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event at workflow changes", async function () {
      // initially worflow is RegisteringVoters, and no event is emmit
      expect(await Voting.workflowStatus()).to.equal(RegisteringVoters);

      // RegisteringVoters => ProposalsRegistrationStarted
      await expect(await Voting.startProposalsRegistering())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(RegisteringVoters, ProposalsRegistrationStarted);

      // ProposalsRegistrationStarted => ProposalsRegistrationEnded
      await expect(await Voting.endProposalsRegistering())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(ProposalsRegistrationStarted, ProposalsRegistrationEnded);

      // ProposalsRegistrationEnded => VotingSessionStarted
      await expect(await Voting.startVotingSession())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(ProposalsRegistrationEnded, VotingSessionStarted);

      // VotingSessionStarted => VotingSessionEnded
      await expect(await Voting.endVotingSession())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(VotingSessionStarted, VotingSessionEnded);

      // VotingSessionEnded => VotingSessionEnded
      await expect(await Voting.tallyVotes())
         .to.emit(Voting, "WorkflowStatusChange")
         .withArgs(VotingSessionEnded, VotesTallied);
   });

   it("sould revert if a voter try to change the workflow", async function () {
      await expect(
         Voting.connect(voter1).startProposalsRegistering()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.startProposalsRegistering();

      await expect(
         Voting.connect(voter1).endProposalsRegistering()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.endProposalsRegistering();

      await expect(
         Voting.connect(voter1).startVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.startVotingSession();

      await expect(
         Voting.connect(voter1).endVotingSession()
      ).to.be.revertedWith("Ownable: caller is not the owner");
      Voting.endVotingSession();

      await expect(Voting.connect(voter1).tallyVotes()).to.be.revertedWith(
         "Ownable: caller is not the owner"
      );
   });
});

describe("Test register voters", function () {
   beforeEach(async function () {
      [owner, voter1] = await ethers.getSigners();
      Voting_Factory = await ethers.getContractFactory("Voting");
      Voting = await Voting_Factory.deploy();
   });

   it("emit an event when a voter is added", async function () {
      await expect(await Voting.addVoter(voter1.address))
         .to.emit(Voting, "VoterRegistered")
         .withArgs(voter1.address);
   });

   it("sould revert if not in a RegisteringVoters session", async function () {
      expect(await Voting.workflowStatus()).to.equal(RegisteringVoters);
      await Voting.addVoter(voter1.address);

      await Voting.startProposalsRegistering();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Voters registration is not open yet"
      );

      await Voting.endProposalsRegistering();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Voters registration is not open yet"
      );

      await Voting.startVotingSession();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Voters registration is not open yet"
      );

      await Voting.endVotingSession();
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Voters registration is not open yet"
      );
   });

   it("should revert if not called by owner", async function () {
      await expect(
         Voting.connect(voter1).addVoter(voter1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
   });

   it("sould revert if a voter is already registered", async function () {
      await Voting.addVoter(voter1.address);
      await expect(Voting.addVoter(voter1.address)).to.be.revertedWith(
         "Already registered"
      );
   });
});
