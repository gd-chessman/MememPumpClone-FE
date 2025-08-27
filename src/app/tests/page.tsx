'use client'
import React, { useState, useEffect } from 'react';
import { Transaction, VersionedTransaction, VersionedMessage } from '@solana/web3.js';

// Phantom wallet type declaration
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (params?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      publicKey?: { toString: () => string };
      signTransaction: (transaction: Transaction) => Promise<Transaction>;
    };
  }
}

export default function PhantomTest() {
  const [createData, setCreateData] = useState({
    order_trade_type: 'buy',
    order_type: 'market',
    order_token_name: 'OFFICIAL TRUMP',
    order_token_address: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
    order_price: 8.86,
    order_qlty: 0.0001,
    user_wallet_address: 'EbMmX3wPCGQvpaLfFLHAKtPn9T9JjrHc1CdaxyJ5Ef6z'
  });

  const [submitData, setSubmitData] = useState({
    order_id: '',
    signature: '',
    signed_transaction: ''
  });

  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [phantomWallet, setPhantomWallet] = useState<any>(null);
  const [isPhantomConnected, setIsPhantomConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');

  const API_URL = 'https://memempumpclone-be-production.up.railway.app';

  // Check if Phantom is installed
  useEffect(() => {
    if ('solana' in window && window.solana) {
      setPhantomWallet(window.solana);
      if (window.solana.isPhantom) {
        // Check if already connected
        window.solana.connect({ onlyIfTrusted: true }).then(() => {
          setIsPhantomConnected(true);
          if (window.solana?.publicKey) {
            setWalletAddress(window.solana.publicKey.toString());
          }
        }).catch(() => {
          // Not connected
        });
      }
    }
  }, []);

  const connectPhantom = async () => {
    try {
      if (phantomWallet && phantomWallet.isPhantom) {
        const response = await phantomWallet.connect();
        setIsPhantomConnected(true);
        setWalletAddress(response.publicKey.toString());
        setCreateData(prev => ({ ...prev, user_wallet_address: response.publicKey.toString() }));
      } else {
        alert('Phantom wallet is not installed! Please install it from https://phantom.app/');
      }
    } catch (error) {
      console.error('Error connecting to Phantom:', error);
    }
  };

  const disconnectPhantom = async () => {
    try {
      if (phantomWallet) {
        await phantomWallet.disconnect();
        setIsPhantomConnected(false);
        setWalletAddress('');
        setCreateData(prev => ({ ...prev, user_wallet_address: '' }));
      }
    } catch (error) {
      console.error('Error disconnecting from Phantom:', error);
    }
  };

  const handleCreateTransaction = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/phantom-trade/create-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData)
      });
      const data = await res.json();
      setResponse(data);
      console.log('Create Transaction Response:', data);
      console.log('Transaction data details:', data.data?.transaction_data);
      console.log('Instructions:', data.data?.transaction_data?.instructions);
      
      if (data.data?.order_id) {
        const newSubmitData = {
          order_id: data.data.order_id.toString(),
          signature: '', // Reset signature
          signed_transaction: '' // Reset signed transaction
        };
        setSubmitData(newSubmitData);
        console.log('Updated Submit Data:', newSubmitData);
        console.log('Serialized transaction available:', !!data.data?.serialized_transaction);
        console.log('Phantom connected:', isPhantomConnected);
        
        // Don't auto-sign, let user manually trigger signing
        setResponse((prev: any) => ({
          ...prev,
          message: 'Transaction created! Click "Sign with Phantom" to continue.'
        }));
      }
    } catch (error) {
      setResponse({ error: (error as Error).message });
    }
    setLoading(false);
  };

  const signTransactionWithPhantom = async (serializedTransactionParam?: string, orderIdParam?: string) => {
    const transactionToSign = serializedTransactionParam || response?.data?.serialized_transaction;
    const orderId = orderIdParam || submitData.order_id || response?.data?.order_id;
    
    if (!transactionToSign) {
      alert('Please create a transaction first!');
      return;
    }
    
    if (!orderId) {
      alert('Order ID is missing!');
      return;
    }

    if (!isPhantomConnected) {
      alert('Please connect Phantom wallet first!');
      return;
    }

    try {
      setLoading(true);
      
      // Convert base64 serialized transaction to Uint8Array
      const serializedTransaction = transactionToSign;
      console.log('Serialized transaction from API:', serializedTransaction);
      
      // Deserialize transaction from base64 (like in PhantomService.ts)
      console.log('Serialized transaction length:', serializedTransaction.length);
      console.log('Serialized transaction first 50 chars:', serializedTransaction.substring(0, 50));
      
      // Check if it's valid base64
      if (!serializedTransaction || serializedTransaction.length === 0) {
        throw new Error('Serialized transaction is empty');
      }
      
      let bytes: Uint8Array;
      
      // Check if it's comma-separated numbers (not base64)
      if (serializedTransaction.includes(',')) {
        console.log('Detected comma-separated format, converting to Uint8Array...');
        const numbers = serializedTransaction.split(',').map((num: string) => parseInt(num.trim()));
        bytes = new Uint8Array(numbers);
        console.log('Converted to bytes length:', bytes.length);
      } else {
        // Try base64 decode
        try {
          const decoded = atob(serializedTransaction);
          bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
          console.log('Decoded base64 bytes length:', bytes.length);
        } catch (error) {
          console.error('Failed to decode base64:', error);
          throw new Error('Invalid serialized transaction format');
        }
      }
      
      // Create Transaction object from bytes
      let transaction;
      try {
        // Try to create as regular Transaction first
        transaction = Transaction.from(bytes);
        console.log('Created regular Transaction');
      } catch (error) {
        console.log('Failed to create regular Transaction, trying VersionedTransaction...');
        // If that fails, try as VersionedTransaction
        transaction = VersionedTransaction.deserialize(bytes);
        console.log('Created VersionedTransaction');
      }
      console.log('Transaction object created:', transaction);
      
      // Step 2: Call window.solana.signTransaction() to show Phantom popup
      console.log('Calling window.solana.signTransaction()...');
      console.log('Phantom wallet object:', phantomWallet);
      
      // This will show Phantom popup for user to approve/reject
      const signedTransaction = await phantomWallet.signTransaction(transaction);
      console.log('User approved transaction in Phantom!');
      console.log('Signed transaction received from Phantom');
      
      // Serialize signed transaction to base64 (like in PhantomService.ts)
      const serializedBytes = signedTransaction.serialize();
      const signedTransactionBase64 = Buffer.from(serializedBytes).toString('base64');
      
      // Extract signature from signed transaction
      const signatures = signedTransaction.signatures;
      const signatureBase64 = signatures.length > 0 ? Buffer.from(signatures[0]).toString('base64') : '';
      
      console.log('Original serialized transaction:', serializedTransaction);
      console.log('Signed transaction length:', signedTransaction.length);
      console.log('Real signature base64:', signatureBase64);
      
      // Update submit data with real signature and signed transaction
      // Use the order_id parameter to ensure it's not lost
      const updatedSubmitData = {
        order_id: orderId,
        signature: signatureBase64, // Use real signature from Phantom
        signed_transaction: signedTransactionBase64
      };
      setSubmitData(updatedSubmitData);
      console.log('Updated Submit Data after signing:', updatedSubmitData);
      console.log('Order ID preserved:', orderId);
      
      setResponse((prev: any) => ({
        ...prev,
        phantom_signed: true,
        message: 'Transaction signed successfully with Phantom!'
      }));
      
    } catch (error) {
      console.error('Error signing transaction:', error);
      setResponse((prev: any) => ({
        ...prev,
        error: `Failed to sign transaction: ${(error as Error).message}`
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitTransaction = async () => {
    setLoading(true);
    try {
      // Validate required fields
      if (!submitData.order_id) {
        throw new Error('Order ID is required');
      }
      if (!submitData.signature) {
        throw new Error('Signature is required');
      }
      if (!submitData.signed_transaction) {
        throw new Error('Signed transaction is required');
      }
      
      console.log('Submitting transaction with data:', submitData);
      console.log('Order ID length:', submitData.order_id?.length);
      console.log('Signature length:', submitData.signature?.length);
      console.log('Signed transaction length:', submitData.signed_transaction?.length);
      
      const res = await fetch(`${API_URL}/api/v1/phantom-trade/submit-signed-transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData)
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(`HTTP ${res.status}: ${errorData.message || 'Unknown error'}`);
      }
      
      const data = await res.json();
      console.log('Submit Transaction Response:', data);
      setResponse(data);
    } catch (error) {
      console.error('Submit Transaction Error:', error);
      setResponse({ error: (error as Error).message });
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial' }}>
      <h1>Phantom Trade API Test</h1>

      
      {/* Phantom Wallet Connection */}
      <div style={{ 
        border: '1px solid #ccc', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        backgroundColor: '#f8f9fa'
      }}>
        <h2>🔗 Phantom Wallet Connection</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
          <span>Status: </span>
          <span style={{ 
            color: isPhantomConnected ? '#28a745' : '#dc3545',
            fontWeight: 'bold'
          }}>
            {isPhantomConnected ? '✅ Connected' : '❌ Not Connected'}
          </span>
        </div>
        {isPhantomConnected && (
          <div style={{ marginBottom: '10px' }}>
            <span>Wallet Address: </span>
            <code style={{ backgroundColor: '#e9ecef', padding: '2px 6px', borderRadius: '4px' }}>
              {walletAddress}
            </code>
          </div>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          {!isPhantomConnected ? (
            <button 
              onClick={connectPhantom}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#6f42c1', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Connect Phantom Wallet
            </button>
          ) : (
            <button 
              onClick={disconnectPhantom}
              style={{ 
                padding: '10px 20px', 
                backgroundColor: '#dc3545', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Disconnect Phantom
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Create Transaction Form */}
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>1. Create Transaction (Backend Builds & Caches)</h2>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Trade Type:</label>
            <select 
              value={createData.order_trade_type}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_trade_type: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="buy">Buy</option>
              <option value="sell">Sell</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Order Type:</label>
            <select 
              value={createData.order_type}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_type: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px' }}
            >
              <option value="market">Market</option>
              <option value="limit">Limit</option>
            </select>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Token Name:</label>
            <input 
              type="text"
              value={createData.order_token_name}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_token_name: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '200px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Token Address:</label>
            <input 
              type="text"
              value={createData.order_token_address}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_token_address: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Price:</label>
            <input 
              type="number"
              step="0.01"
              value={createData.order_price}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_price: parseFloat(e.target.value) }))}
              style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Quantity:</label>
            <input 
              type="number"
              step="0.01"
              value={createData.order_qlty}
              onChange={(e) => setCreateData(prev => ({ ...prev, order_qlty: parseFloat(e.target.value) }))}
              style={{ marginLeft: '10px', padding: '5px', width: '100px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Wallet Address:</label>
            <input 
              type="text"
              value={createData.user_wallet_address}
              onChange={(e) => setCreateData(prev => ({ ...prev, user_wallet_address: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
              placeholder="Enter wallet address"
            />
          </div>

          <button 
            onClick={handleCreateTransaction}
            disabled={loading || !createData.user_wallet_address}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#007bff', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Creating...' : 'Create Transactiona'}
          </button>
        </div>

        {/* Submit Transaction Form */}
        <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h2>2. Submit Signed Transaction (Backend Verifies & Submits to Solana)</h2>
          
          {/* Current Submit Data Status */}
          <div style={{ 
            backgroundColor: '#1a202c', 
            padding: '10px', 
            borderRadius: '4px', 
            marginBottom: '15px',
            border: '1px solid #4a5568'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: '#68d391' }}>📊 Current Submit Data:</h4>
            <div style={{ fontSize: '12px', color: '#e2e8f0' }}>
              <div><strong>Order ID:</strong> {submitData.order_id || '❌ Not set'}</div>
              <div><strong>Signature:</strong> {submitData.signature ? '✅ Set' : '❌ Not set'}</div>
              <div><strong>Signed Transaction:</strong> {submitData.signed_transaction ? '✅ Set' : '❌ Not set'}</div>
            </div>
          </div>
          
          <div style={{ marginBottom: '10px' }}>
            <label>Order ID:</label>
            <input 
              type="text"
              value={submitData.order_id}
              onChange={(e) => setSubmitData(prev => ({ ...prev, order_id: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Signature:</label>
            <input 
              type="text"
              value={submitData.signature}
              onChange={(e) => setSubmitData(prev => ({ ...prev, signature: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '300px' }}
            />
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label>Signed Transaction:</label>
            <textarea 
              value={submitData.signed_transaction}
              onChange={(e) => setSubmitData(prev => ({ ...prev, signed_transaction: e.target.value }))}
              style={{ marginLeft: '10px', padding: '5px', width: '300px', height: '60px' }}
            />
          </div>

          <button 
            onClick={() => {
              console.log('Current submitData:', submitData);
              console.log('Order ID:', submitData.order_id);
              console.log('Signature:', submitData.signature);
              console.log('Signed Transaction:', submitData.signed_transaction);
              alert(`Debug:\nOrder ID: ${submitData.order_id || 'empty'}\nSignature: ${submitData.signature ? 'has data' : 'empty'}\nSigned Transaction: ${submitData.signed_transaction ? 'has data' : 'empty'}`);
            }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#6c757d', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: 'pointer',
              marginRight: '10px'
            }}
          >
            🔍 Debug
          </button>

          <button 
            onClick={() => {
              if (response?.data?.serialized_transaction) {
                signTransactionWithPhantom(response.data.serialized_transaction, response.data.order_id);
              } else {
                alert('Create transaction first!');
              }
            }}
            disabled={loading || !response?.data?.serialized_transaction || !isPhantomConnected}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#ffc107', 
              color: 'black', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              marginRight: '10px'
            }}
          >
            🔐 Sign with Phantom
          </button>

          <button 
            onClick={handleSubmitTransaction}
            disabled={loading}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#28a745', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Submitting...' : 'Submit Transaction'}
          </button>
        </div>
      </div>

      {/* Response Display */}
      {response && (
        <div style={{ marginTop: '20px', border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
          <h3>Response:</h3>
          
          {/* Transaction Details Summary */}
          {response.data && (
            <div style={{ 
              backgroundColor: '#2d3748', 
              padding: '15px', 
              borderRadius: '8px', 
              marginBottom: '15px',
              border: '1px solid #4a5568'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#68d391' }}>📋 Transaction Summary:</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', color: '#e2e8f0' }}>
                <div><strong style={{ color: '#68d391' }}>Order ID:</strong> <code style={{ backgroundColor: '#4a5568', color: '#f7fafc' }}>{response.data.order_id}</code></div>
                <div><strong style={{ color: '#68d391' }}>Trade Type:</strong> {response.data.order_details?.trade_type}</div>
                <div><strong style={{ color: '#68d391' }}>Token Address:</strong> <code style={{ backgroundColor: '#4a5568', color: '#f7fafc' }}>{response.data.order_details?.token_address}</code></div>
                <div><strong style={{ color: '#68d391' }}>Quantity:</strong> {response.data.order_details?.quantity}</div>
                <div><strong style={{ color: '#68d391' }}>Price:</strong> ${response.data.order_details?.price}</div>
                <div><strong style={{ color: '#68d391' }}>Total Value:</strong> ${response.data.order_details?.total_value}</div>
                <div><strong style={{ color: '#68d391' }}>Estimated Fee:</strong> {response.data.estimated_fee} SOL</div>
                <div><strong style={{ color: '#68d391' }}>Cache Timeout:</strong> {response.data.timeout_seconds} seconds ⏰</div>
                <div><strong style={{ color: '#68d391' }}>Status:</strong> <span style={{ color: '#fbbf24' }}>🔄 Cached & Ready for Signing</span></div>
              </div>
                              {response.data.serialized_transaction && (
                  <div style={{ marginTop: '10px' }}>
                    <strong style={{ color: '#68d391' }}>Serialized Transaction:</strong>
                    <div style={{ 
                      backgroundColor: '#4a5568', 
                      color: '#f7fafc',
                      padding: '8px', 
                      borderRadius: '4px', 
                      fontSize: '12px',
                      wordBreak: 'break-all',
                      maxHeight: '60px',
                      overflow: 'auto'
                    }}>
                      {response.data.serialized_transaction}
                    </div>
                  </div>
                )}
            </div>
          )}
          
          <pre style={{ 
            backgroundColor: '#1a1a1a', 
            color: '#ffffff',
            padding: '10px', 
            borderRadius: '4px', 
            overflow: 'auto',
            maxHeight: '400px'
          }}>
            {JSON.stringify(response, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}