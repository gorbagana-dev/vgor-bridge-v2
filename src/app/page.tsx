'use client';

import Script from 'next/script';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, TOKEN_PROGRAM_ID, createTransferInstruction } from '@solana/spl-token';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import ReactMarkdown from 'react-markdown';

const GOR_MINT = new PublicKey('71Jvq4Epe2FCJ7JFSF7jLXdNk1Wy4Bhqd9iL6bEFELvg');
const MULTISIG_WALLET = new PublicKey('8n78FXGjb9iy9HeT3LWXfzvtLfSMwbrpvRfiPLzh3LsN');

const BOOST_POOL_SIZE = 500000; // Fixed boost pool of 500k GOR

export default function Home() {
  const { publicKey, disconnect, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState(0);
  const [committedAmount, setCommittedAmount] = useState(0);
  const [expectedGGor, setExpectedGGor] = useState(0);
  const [boostPoolShare, setBoostPoolShare] = useState(0);
  const [totalCommitted, setTotalCommitted] = useState(0);
  const [userCommittedTotal, setUserCommittedTotal] = useState(0);
  const [toast, setToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });
  const [isCommitting, setIsCommitting] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const { setVisible } = useWalletModal();
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState('');
  const [lastCommittedAmount, setLastCommittedAmount] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  const showToast = (message: string) => {
    setToast({ message, show: true });
    setTimeout(() => {
      setToast({ message: '', show: false });
    }, 3000);
  };

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const getRandomPhoto = () => {
    // Random number between 1 and 121
    const randomNum = Math.floor(Math.random() * 121) + 1;
    // Format with leading zeros (001, 002, etc.)
    const formattedNum = randomNum.toString().padStart(3, '0');
    // Files 112-121 are .jpeg, files 001-111 are .png
    const extension = randomNum >= 112 ? 'jpeg' : 'png';
    return `transnet/${formattedNum}.${extension}`;
  };

  const handleShareOnTwitter = () => {
    const tweetText = `Got my ticket to Gorbagana Alpha Mainnet (aka TRASHNET) by committing $sGOR in the early access campaign! 🗑️\n\nReady to claim my boosted $GOR rewards when Trashnet goes live\n\nIf you hold $GOR, get in early 👇🗑\n\ngorbagana.wtf/trashnet`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(tweetUrl, '_blank');
  };

  const handleCopyImage = async () => {
    try {
      // Prepare tweet text
      const tweetText = `Got my ticket to Gorbagana Alpha Mainnet (aka TRASHNET) by committing $sGOR in the early access campaign! 🗑️\n\nReady to claim my boosted $GOR rewards when Trashnet goes live\n\nIf you hold $GOR, get in early 👇🗑\n\ngorbagana.wtf/trashnet`;
      
      // Fetch image and copy both text and image to clipboard
      const response = await fetch(`/images/${selectedPhoto}`);
      const blob = await response.blob();
      const textBlob = new Blob([tweetText], { type: 'text/plain' });
      
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/plain': textBlob,
          [blob.type]: blob
        })
      ]);
      
      showToast('Text & image copied to clipboard! Ready to paste in your tweet 📋');
    } catch (error) {
      console.error('Failed to copy:', error);
      showToast('Failed to copy. Please try downloading instead.');
    }
  };

  const handleScrollDown = () => {
    const exploreSection = document.querySelector('.section_explore');
    if (exploreSection) {
      exploreSection.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Fetch global commitment stats
  const fetchGlobalStats = async () => {
    try {
      const response = await fetch('/api/commitments/stats');
      const data: any = await response.json();
      if (data.totalCommitted !== undefined) {
        setTotalCommitted(data.totalCommitted);
      }
    } catch (error) {
      console.error('Error fetching global stats:', error);
    }
  };

  // Fetch user-specific stats
  const fetchUserStats = async (walletAddress: string) => {
    try {
      const response = await fetch(`/api/commitments/user?wallet=${walletAddress}`);
      const data: any = await response.json();
      if (data.userTotal !== undefined) {
        setUserCommittedTotal(data.userTotal);
        setTotalCommitted(data.globalTotal);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  // Calculate expected gGOR and boost pool share
  const calculateRewards = useCallback((newAmount: number) => {
    const totalUserCommitment = userCommittedTotal + newAmount;
    const totalGlobalCommitment = totalCommitted + newAmount;

    if (totalGlobalCommitment > 0) {
      const sharePercentage = (totalUserCommitment / totalGlobalCommitment) * 100;
      const boostReward = (sharePercentage / 100) * BOOST_POOL_SIZE;
      const expectedTotal = totalUserCommitment + boostReward;

      setBoostPoolShare(Number(sharePercentage.toFixed(2)));
      setExpectedGGor(Number(expectedTotal.toFixed(2)));
    } else {
      setBoostPoolShare(0);
      setExpectedGGor(0);
    }
  }, [userCommittedTotal, totalCommitted]);

  // Fetch balance and user stats when wallet connects
  useEffect(() => {
    const fetchBalance = async () => {
      if (publicKey) {
        try {
          const ata = await getAssociatedTokenAddress(GOR_MINT, publicKey);
          const account = await getAccount(connection, ata);
          setBalance(Number(account.amount) / 1e6); // GOR has 6 decimals
        } catch (error: unknown) {
          console.error('Error fetching balance:', error);
          setBalance(0);
          if (error instanceof Error && (error.name === 'TokenAccountNotFoundError' || error.message?.includes('could not find account'))) {
            showToast('0 $GOR available to commit');
          }
        }
      } else {
        setBalance(0);
      }
    };

    fetchBalance();
    
    // Fetch user stats when wallet is connected
    if (publicKey) {
      fetchUserStats(publicKey.toBase58());
    } else {
      // Fetch global stats when no wallet connected
      fetchGlobalStats();
    }
  }, [publicKey, connection]);

  // Recalculate rewards when committed amount changes
  useEffect(() => {
    calculateRewards(committedAmount);
  }, [committedAmount, totalCommitted, userCommittedTotal]);

  useEffect(() => {
    const sections = document.querySelectorAll('.snap-section');
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2
    });
    sections.forEach(section => observer.observe(section));
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleCommit = async () => {
    if (!publicKey) {
      showToast('Please connect your wallet first');
      return;
    }

    if (!committedAmount || committedAmount <= 0) {
      showToast('Please enter a valid amount');
      return;
    }

    if (committedAmount > balance) {
      showToast('Insufficient $GOR balance');
      return;
    }

    setIsCommitting(true);

    try {
    
      const userTokenAccount = await getAssociatedTokenAddress(
        GOR_MINT,
        publicKey
      );
    
      const multisigTokenAccount = await getAssociatedTokenAddress(
        GOR_MINT,
        MULTISIG_WALLET,
        true
      );

      const amountInLamports = BigInt(Math.floor(committedAmount * 1e6));
    
      const transferInstruction = createTransferInstruction(
        userTokenAccount,
        multisigTokenAccount,
        publicKey,
        amountInLamports,
        [],
        TOKEN_PROGRAM_ID
      );

      const transaction = new Transaction().add(transferInstruction);

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

    
      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, 'confirmed');

      // Record commitment to database
      try {
        const response = await fetch('/api/commitments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            wallet_address: publicKey.toBase58(),
            amount: committedAmount,
            transaction_signature: signature,
          }),
        });

        if (!response.ok) {
          console.error('Failed to record commitment to database');
        } else {
          // Refresh user stats after successful commit
          await fetchUserStats(publicKey.toBase58());
        }
      } catch (dbError) {
        console.error('Error recording commitment:', dbError);
        // Don't fail the whole transaction if database recording fails
      }

      showToast(`Successfully committed ${committedAmount} $GOR! View on Solscan`);
      
      // Open Solscan in new tab
      window.open(`https://solscan.io/tx/${signature}`, '_blank');
      
      const account = await getAccount(connection, userTokenAccount);
      setBalance(Number(account.amount) / 1e6);
      
      // Save committed amount before resetting
      setLastCommittedAmount(committedAmount);
      
      // Show share modal with random photo
      setSelectedPhoto(getRandomPhoto());
      setShowShareModal(true);
      
      setCommittedAmount(0);

    } catch (error: unknown) {
      console.error('Error committing $GOR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to commit $GOR';
      showToast(`Error: ${errorMessage}`);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <>
      <Script
        src="https://d3e54v103j8qbb.cloudfront.net/js/jquery-3.5.1.min.dc5e7f18c8.js?site=68dbb14b2dbd684a5f9b3714"
        integrity="sha256-9/aliU8dGd2tb6OSsuzixeV4y/faTqgFtohetphbbj0="
        crossOrigin="anonymous"
        strategy="beforeInteractive"
      />
      <Script src="/js/webflow.js" strategy="afterInteractive" />
      <style>
        {`
  .snap-section {
    opacity: 0;
    transform: translateY(-30px);
    transition: opacity 0.6s ease, transform 0.6s ease;
    will-change: opacity, transform;
  }
  .snap-section.visible {
    opacity: 1;
    transform: translateY(0);
  }
  .toast {
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: #3f8326;
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    font-family: inherit;
    font-size: 14px;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  .toast.show {
    transform: translateX(0);
  }
  .share-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 20000;
    opacity: 0;
    transition: opacity 0.3s ease;
  }
  .share-modal-overlay.show {
    opacity: 1;
  }
  .share-modal {
    background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
    border-radius: 16px;
    padding: 20px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    border: 2px solid #3f8326;
    position: relative;
    transform: scale(0.9);
    transition: transform 0.3s ease;
  }
  .share-modal-overlay.show .share-modal {
    transform: scale(1);
  }
  .share-modal-close {
    position: absolute;
    top: 16px;
    right: 16px;
    background: transparent;
    border: none;
    color: #fff;
    font-size: 28px;
    cursor: pointer;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    transition: background 0.2s ease;
  }
  .share-modal-close:hover {
    background: rgba(255, 255, 255, 0.1);
  }
  .share-modal-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 10px;
    color: #3f8326;
    text-align: center;
  }
  .share-modal-photo {
    width: 100%;
    max-height: 200px;
    object-fit: cover;
    border-radius: 12px;
    margin-bottom: 16px;
    border: 2px solid rgba(63, 131, 38, 0.3);
  }
  .share-modal-button {
    width: 100%;
    padding: 12px;
    background: #1DA1F2;
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }
  .share-modal-button:hover {
    background: #1a8cd8;
  }
  .share-modal-button.secondary {
    background: #3f8326;
    margin-top: 8px;
  }
  .share-modal-button.secondary:hover {
    background: #2f6b1b;
  }
  .share-modal-buttons {
    display: flex;
    flex-direction: column;
    gap: 0;
  }
  .share-modal-text {
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
    margin-bottom: 12px;
    font-size: 12px;
    line-height: 1.4;
  }
  .share-modal-hint {
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
    margin-top: 10px;
    font-size: 11px;
    font-style: italic;
  }
  .scroll-down-button {
    transition: opacity 0.2s ease;
  }
  .scroll-down-button:hover {
    opacity: 0.7;
  }
  .button-primary {
    transition: opacity 0.2s ease;
  }
  .button-primary:hover:not(:disabled) {
    opacity: 0.8;
  }
  .button-secondary {
    transition: opacity 0.2s ease;
  }
  .button-secondary:hover {
    opacity: 0.8;
  }
  .text-button-tertiary {
    transition: opacity 0.2s ease;
  }
  .text-button-tertiary:hover {
    opacity: 0.8;
  }
  .faq-question {
    transition: opacity 0.2s ease;
  }
  .faq-question:hover {
    opacity: 0.8;
  }
`}
      </style>
      {toast.show && (
        <div className={`toast ${toast.show ? 'show' : ''}`}>
          {toast.message}
        </div>
      )}
      {showShareModal && (
        <div className={`share-modal-overlay ${showShareModal ? 'show' : ''}`} onClick={() => setShowShareModal(false)}>
          <div className="share-modal" onClick={(e) => e.stopPropagation()}>
            <button className="share-modal-close" onClick={() => setShowShareModal(false)}>×</button>
            <h2 className="share-modal-title">🗑️ Welcome to the Landfill! 🗑️</h2>
            <p className="share-modal-text">
              Congrats on committing to the trash pile! Share on X and let everyone know you&apos;re part of Gorbagana&apos;s Trashnet.
            </p>
            <img src={`/images/${selectedPhoto}`} alt="Gorbagana" className="share-modal-photo" />
            <div className="share-modal-buttons">
              <button className="share-modal-button" onClick={handleShareOnTwitter}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                Share on X
              </button>
              <button className="share-modal-button secondary" onClick={handleCopyImage}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy
              </button>
            </div>
            <p className="share-modal-hint">
              💡 Tip: Copy the image, share on X, then paste it directly into your tweet for maximum degen flex
            </p>
          </div>
        </div>
      )}
      <div className="body">
        <div className="page-wrapper">
          <div className="nav_scroll">
            <div data-animation="default" data-collapse="medium" data-duration="400" data-easing="ease" data-easing2="ease" role="banner" className="navbar w-nav">
              <div className="navbar_container w-container">
                <Link href="/" aria-current="page" className="gorb_logo-wrapper w-nav-brand w--current">
                  <img src="/images/gorb-logo_1gorb-logo.avif" loading="lazy" alt="" className="gorb-logo" />
                  <p className="text-button-tertiary">Gorbagana trashnet</p>
          </Link>
        </div>
            </div>
          </div>
          <div className="main-wrapper">
            <div className="section_hero">
              <div className="padding-global padding-section-large is-hero-section">
                <div className="container-medium is-hero">
                  <div className="hero_content-wrapper">
                    <h1 className="h1" style={{ marginTop: isMobile ? "0px" : "-70px" }}>A TICKET TO THE LANDFIL</h1>
                    <p className="text-size-medium">Commit your $sGOR, claim $gGOR, and join Gorbagana&#x27;s Trashnet.</p>
                    <div className="divider"></div>
                    <div className="sgor-form w-form">
                      <form id="wf-form-sGOR" name="wf-form-sGOR" data-name="sGOR" method="get" className="form" data-wf-page-id="68dbb14b2dbd684a5f9b3713" data-wf-element-id="3c2e244d-31fb-d93a-3a8e-94c9337c564d">
                        <div className="input-title-component">
                          <label htmlFor="name" className="text-size-medium">Amount of $sGOR to Commit</label>
                          <div className="wallet-container">
                            <label htmlFor="name" id="wallet-address" className="text-size-medium white">{publicKey ? publicKey.toBase58().slice(0,4) + '...' + publicKey.toBase58().slice(-4) : 'Not connected'}</label>
                            {publicKey && (
                              <button 
                                type="button"
                                onClick={(e) => { 
                                  e.preventDefault();
                                  disconnect();
                                }} 
                                className="disconnect-button"
                                style={{ background: 'transparent' }}
                              >
                                <img src="/images/exit-wallet.svg" loading="lazy" alt="Disconnect" />
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="input-component">
                          <input className="input-type w-input" maxLength={256} name="sGOR-Amount" data-name="sGOR Amount" placeholder="0" id="sGOR-Amount" value={committedAmount} onChange={(e) => setCommittedAmount(parseFloat(e.target.value) || 0)} />
                          {!publicKey ? (
                            <input 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                setVisible(true);
                              }} 
                              data-wait="Please wait..." 
                              id="connect-wallet" 
                              className="button-primary w-button" 
                              value="🎒Connect wallet" 
                            />
                          ) : (
                            <input 
                              type="button" 
                              onClick={(e) => {
                                e.preventDefault();
                                handleCommit();
                              }} 
                              data-wait="Please wait..." 
                              className="button-primary w-button" 
                              value={isCommitting ? "Committing..." : "Commit $sGOR"}
                              disabled={isCommitting}
                              style={{ opacity: isCommitting ? 0.6 : 1, cursor: isCommitting ? 'not-allowed' : 'pointer' }}
                            />
                          )}
                        </div>
                        <div className="input-title-component">
                          <label htmlFor="name" className="text-size-medium">Expected $gGOR:</label>
                          <div className="wallet-container">
                            <label htmlFor="name" id="expected-gGor" className="text-size-medium white">{expectedGGor}</label>
                          </div>
                        </div>
                        <div className="input-title-component">
                          <label htmlFor="name" className="text-size-medium">Your Boost Pool Share:</label>
                          <div className="wallet-container">
                            <label htmlFor="name" id="boost-pool-share" className="text-size-medium white">{boostPoolShare}%</label>
                          </div>
                        </div>
                        <div className="input-title-component">
                          <label htmlFor="name" className="text-size-medium">$GOR Balance:</label>
                          <div className="wallet-container">
                            <label htmlFor="name" className="text-size-medium white">{balance}</label>
                          </div>
                        </div>
                      </form>
                      {/* TEST BUTTON - Remove this after testing */}
                      {/* <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLastCommittedAmount(committedAmount || 100);
                          setSelectedPhoto(getRandomPhoto());
                          setShowShareModal(true);
                        }}
                        style={{
                          marginTop: '12px',
                          padding: '12px 20px',
                          background: '#ff6b35',
                          color: 'white',
                          border: '2px solid #ff8c61',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          width: '100%'
                        }}
                      >
                        🧪 TEST POPUP (Remove Later)
                      </button> */}
                      <div style={{
                        marginTop: '12px',
                        padding: '12px 16px',
                        backgroundColor: 'rgba(255, 193, 7, 0.1)',
                        border: '1px solid rgba(255, 193, 7, 0.3)',
                        borderRadius: '8px',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start'
                      }}>
                        <span style={{ fontSize: '16px', flexShrink: 0 }}>⚠️</span>
                        <p style={{ margin: 0, fontSize: '12px', lineHeight: '1.6', color: 'rgba(255, 255, 255, 0.85)' }}>
                          <strong>Note:</strong> The displayed $gGOR and Boost Pool shares are projected estimates based on current participation and may vary depending on the total $sGOR committed before the cutoff.
                        </p>
                      </div>
                      <div className="w-form-done">
                        <div>Thank you! Your submission has been received!</div>
                      </div>
                      <div className="w-form-fail">
                        <div>Oops! Something went wrong while submitting the form.</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="explore_buttons-wrapper">
                  <a href="https://jup.ag/swap/GOR-USDC" target="_blank" className="button-icon w-inline-block scroll-down-button">
                    <img src="/images/GOR.svg" loading="lazy" alt="" className="icon-button" />
                    <p className="text-button-tertiary">BUY $GOR</p>
                  </a>
                  <div className="button-icon scroll-down-button" onClick={handleScrollDown} style={{ cursor: 'pointer' }}>
                    <img src="/images/arrow-down.svg" loading="lazy" alt="" className="icon-button" />
                    <p className="text-button-tertiary">SCROLL DOWN</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="section_explore snap-section">
              <div className="sticky-section-explore">
                <div className="padding-global padding-section-large is-explore-mobile">
                  <div className="container-medium">
                    <div className="explore_content-wrapper">
                      <div className="w-layout-grid explore-grid">
                        <div className="explore-card">
                          <div className="explore-card_title-wrapper">
                            <div className="explore-card_header-wrapper">
                              <h3 className="h3">Trashdrop Incoming</h3>
                            </div>
                          </div>
                          <p className="text-size-medium light-grey">At least 500,000 $gGOR airdropped pro-rata to $sGOR holders (above threshold). Balances are backed 1:1 by $sGOR purchased on the market.</p>
                        </div>
                        <div id="w-node-ed2e4c96-c6ba-3183-04fe-6c8be7d83fc7-5f9b3713" className="explore-card size-large">
                          <h1 className="h1 text-align-center">PRE<br/>MAINNET</h1>
                          <p className="text-size-large color-is-grey align-center">The alpha network for Gorbagana. Same validators, tokens, and apps as mainnet, but without a bridge at first.</p>
                          <img src="/images/trashcoin.avif" loading="lazy" alt="" className="trash-coin" />
                        </div>
                        <div className="explore-card">
                          <div className="explore-card_title-wrapper">
                            <div className="explore-card_header-wrapper">
                              <h3 className="h3">Safer Start</h3>
                            </div>
                          </div>
                          <p className="text-size-medium light-grey">At launch, there&#x27;s no live Solana ↔ Gorbagana bridge. This reduces risk, keeps things simple, and gives time to battle taste the trashnet.</p>
                        </div>
                        <div className="explore-card">
                          <div className="explore-card_title-wrapper">
                            <div className="explore-card_header-wrapper">
                              <h3 className="h3">Early Access Boost Pool</h3>
                            </div>
                          </div>
                          <p className="text-size-medium light-grey">Commit $sGOR early → get 1:1 $gGOR plus a share of an extra 500,000 $GOR Boost Pool, strictly pro-rata. More trash bags in, bigger scoop.</p>
                        </div>
                        <div className="explore-card">
                          <div className="explore-card_title-wrapper">
                            <div className="explore-card_header-wrapper">
                              <h3 className="h3">DEX &amp; Launchpad Ready</h3>
                            </div>
                          </div>
                          <p className="text-size-medium light-grey">Trashnet ships with a native DEX + Launchpad (DBC + CLMMv2). Swap tokens and experiment with launches from day one.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="section_build snap-section">
              <div className="padding-global ">
                <div className="container-medium">
                  <div id="build-on-gor" className="build_content-wrapper">
                    <div className="build_column-wrapper">
                      <h3 className="h3">TRASH FAQ</h3>
                      <p className="text-size-large color-is-grey dark">Get your degen questions answered</p>
                      {[
                        {
                          title: "What is Gorbagana?",
                          content: "Gorbagana is a new high-performance Layer-1 blockchain network forked from Solana's codebase, designed to combine meme culture energy with serious infrastructure capabilities."
                        },
                        {
                          title: "What is $GOR?",
                          content: "Currently $GOR exists as an SPL token on Solana, launched via PumpFun as a 100% community-owned token with no team allocation."
                        },
                        {
                          title: "What are $sGOR and $gGOR?",
                          content: "$sGOR stands for \"Solana GOR\" - the $GOR tokens that exist on the Solana network right now. $gGOR refers to \"Gorbagana GOR\" - the form of $GOR that will exist natively on the Gorbagana chain (Trashnet). They are essentially the same asset represented on two different chains."
                        },
                        {
                          title: "What is Gorbagana Early Access Program?",
                          content: "A special pre-launch campaign to reward our early believers, $GOR holders and Gorbagana community members who commit their tokens (\"$sGOR\")  to Gorbagana Chain in advance of Trashnet launch. Early participants will be eligible for the trashdrop (bonus $gGOR)."
                        },
                        {
                          title: "What is the \"Ticket to Trashnet\" card?",
                          content: "It's your **onchain, shareable pass** issued when you commit **$sGOR** via the Gorbagana Early Access Program. The Ticket stamps you as an **early GORbage believer**, locks your spot for Trashnet, and shows you're **potentially eligible for the Trashdrop**."
                        },
                        {
                          title: "What is vBridge and how does it work?",
                          content: `vBridge is the portal enabling the Early Access Program. Here's the process:

- You connect the wallet that holds your $GOR on Solana to the vbridge portal and deposit an amount of $sGOR you want to move to Gorbagana trashnet.

- Your committed $sGOR is locked until the Gorbagana Trashnet (alpha mainnet) launches. Think of it as checking your tokens into a vault that will open at launch. 

- When Trashnet launches, claim your equivalent amount of $gGOR on Gorbagana at 1:1 value for every $sGOR you committed, plus some extra $gGOR (trashdrop) as a bonus. The extra comes from a reward pool funded by the Gorbagana Labs to amplify early supporters' holdings.

Your $gGOR becomes the native gas token for Gorbagana Network. Access to DEX, launchpad, and all the trashy DeFi you can handle.`
                        },
                        {
                          title: "How is $gGOR backed?",
                          content: "Every $gGOR is backed 1:1 by $sGOR reserves. Gorbagana Labs purchases $sGOR on the open market and \"virtually bridges\" it to Trashnet."
                        },
                        {
                          title: "What is Gorbagana Trashnet?",
                          content: "Trashnet aka alpha mainnet is Gorbagana’s pre-mainnet. A live environment where the Gorbagana chain runs with the same validator software (single sequencer run by Gorbagana Labs PBC), tokens, and apps as Gorbagana mainnet will, but with lower value at risk. Think of it as the trashy testnet where degens can lock up $sGOR to earn $gGOR when the main network launches."
                        },
                        {
                          title: `Will the bridge be live on the day of Trashnet launch?`,
                          content: `Yes. A one-way bridge from Solana to Gorbagana will go live on the day of Trashnet launch. You can directly bridge your $GOR and Gorbagio NFT that currenlty existis on Solana network to Gorbagana network at 1:1 parity.`
                        },
                        {
                          title: `What happens when Trashnet launches?`,
                          content: `Your $gGOR becomes the native gas token for Gorbagana Network. Access to DEX, launchpad, and all the trashy DeFi you can handle.`
                        },
                        {
                          title: `What is Trashdrop?`,
                          content: `It is a modest, **pro-rata airdrop of $gGOR on Trashnet** for existing **$sGOR holders on Solana who commit their $sGOR in Early Access Program**. In short, Trashdrop: Airdropped $gGOR fully backed by $sGOR. Think of it as Gorbagana team “virtually bridging” $sGOR on your behalf to amplify your $gGOR holdings. This bonus comes from a 500,000 $GOR reward pool funded by Gorbagana Labs (purchased from the open market).`
                        },
                        {
                          title: `Who’s eligible for the Trashdrop?`,
                          content: `If you already hold **$GOR on Solana** and **bridge during the Early Access window**, you are in scope. We’re focusing on **meaningful holders** (no dust wallets), so allocations go to wallets with a real stack. If you **bridge after** the early access window closes, you **won’t be eligible** for the trashdrop.`
                        },
                        {
                          title: `Are there any exclusive benefits for Gorbagio Holders on Trashnet Launch?`,
                          content: `Yes, our **official Gorbagio NFT holders** sit in the front row. They are eligible for holder-only perks and priority in select moments, which will be announced as a surprise by the GORbage team.`
                        },
                        {
                          title: `How the boost pool work?`,
                          content: `Your bonus scales with your share of total $sGOR committed during Early Access. The more bags you commit, more your boost pool share and expected $gGOR at trashnet.`
                        },
                        {
                          title: `Are the projected $gGOR and Boost Pool figures final?`,
                          content: `No, the values displayed are dynamic estimates. They're calculated from the total $sGOR committed so far and your share in it. As more participants join before launch, the final $gGOR and Boost Pool distribution will adjust automatically. Your onchain allocation will always reflect the final snapshot at the time of launch.`
                        },
                        {
                          title: `Will I still be able to bridge my $sGOR after Early Access Program ends?`,
                          content: `Yes. When Trashnet goes live, the will be open. You can buy more **$sGOR** on Solana and bridge it anytime with **Solana → Gorbagana** bridge. Remember, only  **Early Access commits get the trashdrop** - bridges after the early window ends will not qualify for the boost pool share.`
                        },
                      ].map((faq, index) => (
                        <div key={index} className="faq-question" onClick={() => toggleFaq(index)} style={{ cursor: 'pointer' }}>
                        <div className="button_left-wrapper">
                            <div className="text-button-tertiary">
                              <ReactMarkdown>{faq.title}</ReactMarkdown>
                            </div>
                            <img src="/images/keyboard_arrow_down.svg" loading="lazy" style={{ transform: `translate3d(0, 0, 0) scale3d(1, 1, 1) rotateX(0) rotateY(0) rotateZ(${openFaqIndex === index ? '0' : '90'}deg) skew(0, 0)`, transition: 'transform 0.3s ease' }} alt="" className="faq-arrow" />
                        </div>
                          <div style={{ height: openFaqIndex === index ? 'auto' : '0px', overflow: 'hidden', transition: 'height 0.3s ease' }} className="faq-answer-body">
                          <div className="faq-answer-body-inner">
                              <div className="text-size-small faq-answer">
                                <ReactMarkdown>{faq.content}</ReactMarkdown>
                              </div>
                          </div>
                        </div>
                      </div>
                      ))}
                    </div>
                    <div className="build_column-wrapper align-center">
                      <img src="/images/gorbagio-sit_1gorbagio-sit.avif" loading="lazy" sizes="(max-width: 1016px) 100vw, 1016px" srcSet="/images/gorbagio-sit_1gorbagio-sit.avif 500w, /images/gorbagio-sit_1gorbagio-sit.avif 1016w" alt="" className="gorbagio-sit" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="footer snap-section">
              <div className="padding-global is-footer">
                <div className="container-medium">
                  <div className="footer_content-wrapper">
                    <div id="join-gang" className="footer-header_content-wrapper">
                      <h1 className="h2 text-align-center">Builders. Degens. Shitposters. <br />Trash philosophers.<br /><br />If you&#x27;re pushing garbage <br/> on-chain, this is your landfill.</h1>
                      <img src="/images/gorbagio-g_1gorbagio-g.avif" loading="lazy" alt="" className="gorbagio-g" />
                      <div className="buttons-container">
                        <a href="https://x.com/Gorbagana_chain" target="_blank" className="button-secondary w-inline-block">
                          <p className="text-button-primary">Follow us on X</p>
                        </a>
                        <a href="https://t.me/gorbagana_portal" target="_blank" className="button-secondary w-inline-block">
                          <p className="text-button-primary">Join us on Telegram</p>
                        </a>
                      </div>
                    </div>
                    <div className="gorb_logo-wrapper">
                      <img src="/images/gorb-logo_1gorb-logo.avif" loading="lazy" alt="" className="gorb-logo" />
                      <p className="text-button-tertiary">Gorbagana</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
    </>
  );
}
