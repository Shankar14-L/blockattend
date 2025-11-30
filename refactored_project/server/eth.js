const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');

const RPC = process.env.RPC_URL || 'https://rpc.sepolia.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY || '';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '';
const ABI_PATH = path.join(__dirname, 'contract-abi.json');

function getProvider(){ return new ethers.JsonRpcProvider(RPC); }
function getSigner(provider){ if (!PRIVATE_KEY) return null; return new ethers.Wallet(PRIVATE_KEY, provider); }

function getContract(providerOrSigner){
  if (!CONTRACT_ADDRESS) return null;
  let abi = [];
  if (fs.existsSync(ABI_PATH)) {
    try { abi = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8')); } catch(e){ abi = []; }
  }
  return new ethers.Contract(CONTRACT_ADDRESS, abi, providerOrSigner);
}

async function recordAttendanceOnChain(sessionCode){
  if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY not set in env');
  if (!CONTRACT_ADDRESS) throw new Error('CONTRACT_ADDRESS not set in env');
  const provider = getProvider();
  const signer = getSigner(provider);
  if (!signer) throw new Error('Signer could not be created');
  const contract = getContract(signer);
  if (!contract || typeof contract.markAttendance !== 'function') {
    throw new Error('Contract or markAttendance method not available. Ensure ABI and address are correct.');
  }
  const tx = await contract.markAttendance(sessionCode);
  await tx.wait();
  return tx.hash;
}

module.exports = { recordAttendanceOnChain };

