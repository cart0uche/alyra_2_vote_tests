const { expect } = require("chai");
const { ethers } = require("hardhat");
const BN = require("bn.js");

describe("Vote contract", function () {
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
         let Voting_Factory = await ethers.getContractFactory("Voting");
         Voting = await Voting_Factory.deploy();
      });

      it("emit an event at workflow changes", async function () {
         // initially worflow is RegisteringVoters, and no event is emmit
         expect(await Voting.workflowStatus()).to.equal(RegisteringVoters);

         // RegisteringVoters => ProposalsRegistrationStarted
         await expect(await Voting.startProposalsRegistering())
            .to.emit(Voting, "WorkflowStatusChange")
            .withArgs(RegisteringVoters, ProposalsRegistrationStarted);
         expect(await Voting.workflowStatus()).to.equal(
            ProposalsRegistrationStarted
         );

         // ProposalsRegistrationStarted => ProposalsRegistrationEnded
         await expect(await Voting.endProposalsRegistering())
            .to.emit(Voting, "WorkflowStatusChange")
            .withArgs(ProposalsRegistrationStarted, ProposalsRegistrationEnded);
         expect(await Voting.workflowStatus()).to.equal(
            ProposalsRegistrationEnded
         );

         // ProposalsRegistrationEnded => VotingSessionStarted
         await expect(await Voting.startVotingSession())
            .to.emit(Voting, "WorkflowStatusChange")
            .withArgs(ProposalsRegistrationEnded, VotingSessionStarted);
         expect(await Voting.workflowStatus()).to.equal(VotingSessionStarted);

         // VotingSessionStarted => VotingSessionEnded
         await expect(await Voting.endVotingSession())
            .to.emit(Voting, "WorkflowStatusChange")
            .withArgs(VotingSessionStarted, VotingSessionEnded);
         expect(await Voting.workflowStatus()).to.equal(VotingSessionEnded);

         // VotingSessionEnded => VotingSessionEnded
         await expect(await Voting.tallyVotes())
            .to.emit(Voting, "WorkflowStatusChange")
            .withArgs(VotingSessionEnded, VotesTallied);
         expect(await Voting.workflowStatus()).to.equal(VotesTallied);
      });

      it("should revert if not called by owner", async function () {
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

      it("should revert if we call startProposalsRegistering after endProposalsRegistering", async function () {
         await Voting.startProposalsRegistering();
         await Voting.endProposalsRegistering();
         await expect(Voting.startProposalsRegistering()).to.be.revertedWith(
            "Registering proposals cant be started now"
         );
      });

      it("should revert if we call endProposalsRegistering after startVotingSession", async function () {
         await Voting.startProposalsRegistering();
         await Voting.endProposalsRegistering();
         await Voting.startVotingSession();
         await expect(Voting.endProposalsRegistering()).to.be.revertedWith(
            "Registering proposals havent started yet"
         );
      });

      it("should revert if we call startVotingSession after endVotingSession", async function () {
         await Voting.startProposalsRegistering();
         await Voting.endProposalsRegistering();
         await Voting.startVotingSession();
         await Voting.endVotingSession();
         await expect(Voting.startVotingSession()).to.be.revertedWith(
            "Registering proposals phase is not finished"
         );
      });

      it("should revert if we call endVotingSession after tallyVotes", async function () {
         await Voting.startProposalsRegistering();
         await Voting.endProposalsRegistering();
         await Voting.startVotingSession();
         await Voting.endVotingSession();
         await Voting.tallyVotes();
         await expect(Voting.endVotingSession()).to.be.revertedWith(
            "Voting session havent started yet"
         );
      });
   });

   describe("Test register voters", function () {
      beforeEach(async function () {
         [owner, voter1, voter2] = await ethers.getSigners();
         let Voting_Factory = await ethers.getContractFactory("Voting");
         Voting = await Voting_Factory.deploy();
      });

      it("emit an event when a voter is added", async function () {
         await expect(await Voting.addVoter(voter1.address))
            .to.emit(Voting, "VoterRegistered")
            .withArgs(voter1.address);
      });

      it("return voter information", async function () {
         await Voting.addVoter(voter1.address);
         const voter = await Voting.connect(voter1).getVoter(voter1.address);
         expect(voter.isRegistered).to.be.true;
         expect(voter.hasVoted).to.be.false;
         expect(voter.votedProposalId).to.be.equal(new BN(0));
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

      it("sould revert if getVoter() is called by a non voter", async function () {
         await Voting.addVoter(voter1.address);
         await expect(
            Voting.connect(voter2).getVoter(voter1.address)
         ).to.be.revertedWith("You're not a voter");
      });
   });

   describe("Test register a proposal", function () {
      beforeEach(async function () {
         [owner, voter1, voter2, voter3] = await ethers.getSigners();
         let Voting_Factory = await ethers.getContractFactory("Voting");
         Voting = await Voting_Factory.deploy();

         await Voting.addVoter(voter1.address);
         await Voting.addVoter(voter2.address);
         await Voting.startProposalsRegistering();
      });

      it("emit an event when a proposal is added", async function () {
         await expect(await Voting.connect(voter1).addProposal("proposal1"))
            .to.emit(Voting, "ProposalRegistered")
            .withArgs(1);
      });

      it("return proposal information", async function () {
         await Voting.connect(voter1).addProposal("proposal1");
         const proposalId1 = await Voting.connect(voter1).getOneProposal(1);
         expect(proposalId1.description).to.be.equal("proposal1");
      });

      it("should revert if not called in a proposal register session", async function () {
         await Voting.connect(voter1).addProposal("proposal0");

         await Voting.endProposalsRegistering();
         await expect(
            Voting.connect(voter1).addProposal("proposal0")
         ).to.be.revertedWith("Proposals are not allowed yet");

         await Voting.startVotingSession();
         await expect(
            Voting.connect(voter1).addProposal("proposal0")
         ).to.be.revertedWith("Proposals are not allowed yet");

         await Voting.endVotingSession();
         await expect(
            Voting.connect(voter1).addProposal("proposal0")
         ).to.be.revertedWith("Proposals are not allowed yet");
      });

      it("should revert if the caller is not a voter", async function () {
         await expect(
            Voting.connect(voter3).addProposal("proposal0")
         ).to.be.revertedWith("You're not a voter");
      });

      it("should revert if empty proposal", async function () {
         await expect(
            Voting.connect(voter1).addProposal("")
         ).to.be.revertedWith("Vous ne pouvez pas ne rien proposer");
      });

      it("should revert if a non voter call getOneProposal", async function () {
         await expect(
            Voting.connect(voter3).getOneProposal(0)
         ).to.be.revertedWith("You're not a voter");
      });
   });

   describe("Test adding a vote", function () {
      beforeEach(async function () {
         [owner, voter1, voter2, voter3] = await ethers.getSigners();
         let Voting_Factory = await ethers.getContractFactory("Voting");
         Voting = await Voting_Factory.deploy();

         await Voting.addVoter(voter1.address);
         await Voting.addVoter(voter2.address);
         await Voting.startProposalsRegistering();
         await Voting.connect(voter1).addProposal("description1");
         await Voting.connect(voter2).addProposal("description2");
         await Voting.endProposalsRegistering();
         await Voting.startVotingSession();
      });

      it("emit an event when a vote is added", async function () {
         await expect(await Voting.connect(voter1).setVote(0))
            .to.emit(Voting, "Voted")
            .withArgs(voter1.address, 0);
      });

      it("should revert if the caller is not a voter", async function () {
         await expect(Voting.connect(voter3).setVote(0)).to.be.revertedWith(
            "You're not a voter"
         );
      });

      it("should revert if a voter vote twice", async function () {
         await Voting.connect(voter1).setVote(0);
         await expect(Voting.connect(voter1).setVote(0)).to.be.revertedWith(
            "You have already voted"
         );
      });

      it("should revert if a voter vote for an unknown proposal", async function () {
         await expect(Voting.connect(voter1).setVote(3)).to.be.revertedWith(
            "Proposal not found"
         );
      });

      it("should revert if not in a vote session", async function () {
         await Voting.endVotingSession();

         await expect(Voting.connect(voter1).setVote(1)).to.be.revertedWith(
            "Voting session havent started yet"
         );
      });
   });

   describe("Test count votes", function () {
      beforeEach(async function () {
         [owner, voter1, voter2, voter3, voter4, voter5] =
            await ethers.getSigners();
         let Voting_Factory = await ethers.getContractFactory("Voting");
         Voting = await Voting_Factory.deploy();

         await Voting.addVoter(voter1.address);
         await Voting.addVoter(voter2.address);
         await Voting.addVoter(voter3.address);
         await Voting.addVoter(voter4.address);
         await Voting.startProposalsRegistering();
         await Voting.connect(voter1).addProposal("description1");
         await Voting.connect(voter2).addProposal("description2");
         await Voting.connect(voter3).addProposal("description3");
         await Voting.connect(voter4).addProposal("description4");
         await Voting.endProposalsRegistering();
         await Voting.startVotingSession();
      });

      it("should revert if not called by owner", async function () {
         await Voting.endVotingSession();
         await expect(Voting.connect(voter1).tallyVotes()).to.be.revertedWith(
            "Ownable: caller is not the owner"
         );
      });

      it("should revert if session vote is not ended", async function () {
         await Voting.connect(voter1).setVote(0);

         await expect(Voting.tallyVotes()).to.be.revertedWith(
            "Current status is not voting session ended"
         );
      });

      it("count vote, 1 vote for proposal1", async function () {
         await Voting.connect(voter1).setVote(1);
         await Voting.endVotingSession();

         await Voting.tallyVotes();
         const result = await Voting.winningProposalID();
         expect(result).to.be.equal(new BN(1));
      });

      it("count vote, 1 vote for proposal1, 2 vote for proposal2", async function () {
         await Voting.connect(voter1).setVote(1);
         await Voting.connect(voter2).setVote(2);
         await Voting.connect(voter3).setVote(2);
         await Voting.endVotingSession();

         await Voting.tallyVotes();
         const result = await Voting.winningProposalID();
         expect(result).to.be.equal(new BN(2));
      });

      it("count vote, 2 vote for proposal1, 1 vote for proposal2", async function () {
         await Voting.connect(voter1).setVote(1);
         await Voting.connect(voter2).setVote(1);
         await Voting.connect(voter3).setVote(2);
         await Voting.endVotingSession();

         await Voting.tallyVotes();
         const result = await Voting.winningProposalID();
         expect(result).to.be.equal(new BN(1));
      });

      it("count vote, 1 vote for proposal1, 2 vote for proposal2, 1 vote for proposal3", async function () {
         await Voting.connect(voter1).setVote(1);
         await Voting.connect(voter2).setVote(2);
         await Voting.connect(voter3).setVote(2);
         await Voting.connect(voter4).setVote(3);
         await Voting.endVotingSession();

         await Voting.tallyVotes();
         const result = await Voting.winningProposalID();
         expect(result).to.be.equal(new BN(2));
      });

      it("count vote, nobody vote", async function () {
         await Voting.endVotingSession();

         await Voting.tallyVotes();
         const result = await Voting.winningProposalID();
         expect(result).to.be.equal(new BN(0));
      });
   });
});
