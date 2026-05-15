// src/pages/MyTeam.jsx
import React, { useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { subscribeRoster, updateRoster, makeTransfer, activateChip } from '../utils/firestore';
import { usePlayerStats } from '../hooks/useVLR';
import {
  GameweekBanner, SkeletonCard, ChipSelector, TransferModal, EmptyState,
  PlayerAvatarCircle, RoleBadge, FormIndicator, useToast, Toast
} from '../components/UI';
import { Link } from 'react-router-dom';

export default function MyTeam() {
  const { user, activeLeagueId, myLeagues, currentGameweek } = useApp();
  const [roster, setRoster] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSlot, setPickerSlot] = useState(null);
  const [transferModal, setTransferModal] = useState(null);
  const { msg, show: showToast } = useToast();

  useEffect(() => {
    if (!user || !activeLeagueId) { setLoading(false); return; }
    const unsub = subscribeRoster(activeLeagueId, user.uid, r => {
      setRoster(r);
      setLoading(false);
    });
    return unsub;
  }, [user, activeLeagueId]);

  const leagueData = myLeagues.find(l => l.id === activeLeagueId);
  const freeTransfers = leagueData?.freeTransfersPerGW ?? 1;
  const transferCost = leagueData?.transferCostPts ?? 4;
  const usedTransfers = roster?.transfersThisGW ?? 0;
  const hasFreeTransfer = usedTransfers < freeTransfers;

  function openSlot(idx) {
    setPickerSlot(idx);
    setShowPicker(true);
  }

  async function pickPlayer(player) {
    if (!roster || !activeLeagueId) return;
    const existing = roster.players ?? [];
    const isSwap = pickerSlot < existing.length;

    if (isSwap) {
      const outId = existing[pickerSlot];
      if (currentGameweek?.status === 'active') {
        // Show transfer modal
        setShowPicker(false);
        setTransferModal({ outId, inId: player.ign });
        return;
      }
    }

    const newPlayers = [...existing];
    newPlayers[pickerSlot] = player.ign;
    try {
      await updateRoster(activeLeagueId, user.uid, newPlayers.slice(0, 5), roster.captainId);
      showToast(`${player.ign} added to your roster!`);
    } catch (e) {
      showToast('Error updating roster');
    }
    setShowPicker(false);
  }

  async function setCaptain(playerId) {
    if (!roster || !activeLeagueId) return;
    await updateRoster(activeLeagueId, user.uid, roster.players, playerId);
    showToast(`${playerId} set as captain (2× points)`);
  }

  async function confirmTransfer() {
    if (!transferModal) return;
    const isFree = hasFreeTransfer;
    try {
      await makeTransfer(activeLeagueId, user.uid, transferModal.outId, transferModal.inId, isFree, transferCost);
      showToast(`Transfer complete${!isFree ? ` (-${transferCost} pts)` : ''}`);
    } catch (e) {
      showToast('Transfer failed');
    }
    setTransferModal(null);
  }

  async function handleChipActivate(chipKey) {
    if (!activeLeagueId || !currentGameweek) return;
    try {
      await activateChip(activeLeagueId, user.uid, chipKey, currentGameweek.id);
      showToast(`${chipKey} chip activated!`);
    } catch {
      showToast('Failed to activate chip');
    }
  }

  if (!user) return <EmptyState icon="🔒" title="Sign in to manage your team" cta="Sign In" />;
  if (!activeLeagueId) return (
    <EmptyState
      icon="🏆"
      title="Join a league first"
      subtitle="You need to be in a league to draft a team."
      cta="Go to Leagues"
      onCta={() => {}}
    />
  );
  if (loading) return <SkeletonCard height={400} />;

  const players = roster?.players ?? [];
  const slots = Array.from({ length: 5 }, (_, i) => players[i] ?? null);

  return (
    <div>
      <Toast message={msg} />
      {currentGameweek && <GameweekBanner gameweek={currentGameweek} />}

      {/* Transfer banner */}
      <div className="transfer-banner">
        <span style={{ fontSize: 12, color: 'var(--gold)' }}>
          {hasFreeTransfer
            ? `${freeTransfers - usedTransfers} free transfer${freeTransfers - usedTransfers !== 1 ? 's' : ''} available`
            : `No free transfers — next costs ${transferCost} pts`}
        </span>
        <span style={{ background: hasFreeTransfer ? 'var(--gold)' : 'rgba(255,255,255,0.08)', color: hasFreeTransfer ? '#1a1200' : 'var(--text-muted)', fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 10 }}>
          {hasFreeTransfer ? 'FREE' : `${transferCost} PTS`}
        </span>
      </div>

      {/* Info bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
        <div className="metric-tile" style={{ flex: 1 }}>
          <div className="val">{players.length}/5</div>
          <div className="key">Players</div>
        </div>
        {leagueData?.budgetEnabled && (
          <div className="metric-tile" style={{ flex: 1 }}>
            <div className="val" style={{ color: 'var(--gold)' }}>{roster?.budget ?? 0}cr</div>
            <div className="key">Budget</div>
          </div>
        )}
        <div className="metric-tile" style={{ flex: 1 }}>
          <div className="val">{usedTransfers}</div>
          <div className="key">Transfers</div>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => showToast('Roster saved!')}
        >
          Save Roster
        </button>
      </div>

      {/* Pitch */}
      <div className="pitch-area" style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.15)', textTransform: 'uppercase', letterSpacing: 2 }}>
          {currentGameweek?.name ?? 'My Roster'}
        </div>

        {/* Top 2 slots */}
        <div className="pitch-row">
          {slots.slice(0, 2).map((pid, i) => (
            <PlayerSlot
              key={i}
              playerId={pid}
              isCaptain={pid && pid === roster?.captainId}
              onOpen={() => openSlot(i)}
              onSetCaptain={() => pid && setCaptain(pid)}
            />
          ))}
        </div>

        {/* Bottom 3 slots */}
        <div className="pitch-row">
          {slots.slice(2, 5).map((pid, i) => (
            <PlayerSlot
              key={i + 2}
              playerId={pid}
              isCaptain={pid && pid === roster?.captainId}
              onOpen={() => openSlot(i + 2)}
              onSetCaptain={() => pid && setCaptain(pid)}
            />
          ))}
        </div>
      </div>

      {/* Chips */}
      <div className="card">
        <div className="card-title">Chips</div>
        <ChipSelector
          chips={roster?.chips ?? {}}
          activeChip={roster?.activeChip}
          onActivate={handleChipActivate}
          gwId={currentGameweek?.id}
        />
      </div>

      {/* Player picker modal */}
      {showPicker && (
        <PlayerPickerModal
          currentPlayers={players}
          slotIndex={pickerSlot}
          onPick={pickPlayer}
          onClose={() => setShowPicker(false)}
        />
      )}

      {/* Transfer confirm modal */}
      {transferModal && (
        <TransferModal
          outPlayer={{ ign: transferModal.outId, org: '' }}
          inPlayer={{ ign: transferModal.inId, org: '' }}
          isFree={hasFreeTransfer}
          cost={transferCost}
          onConfirm={confirmTransfer}
          onCancel={() => setTransferModal(null)}
        />
      )}
    </div>
  );
}

// ─── Player Slot ──────────────────────────────────────────────────────────────
function PlayerSlot({ playerId, isCaptain, onOpen, onSetCaptain }) {
  if (!playerId) {
    return (
      <div className="player-slot" onClick={onOpen}>
        <div className="slot-empty">+</div>
        <div style={{ height: 13 }} />
        <div className="slot-ign" style={{ color: 'var(--text-muted)' }}>Pick Player</div>
        <div className="slot-team" style={{ color: 'var(--text-hint)' }}>—</div>
        <div className="slot-pts" style={{ color: 'var(--text-hint)' }}>—</div>
      </div>
    );
  }

  return (
    <div
      className={`player-slot filled${isCaptain ? ' captain' : ''}`}
      onClick={onOpen}
    >
      <div className="slot-avatar" style={{ background: require('../components/UI').avatarColor(playerId) }}>
        {playerId.slice(0, 2).toUpperCase()}
      </div>
      {isCaptain ? <div className="slot-cap-tag">★ Captain</div> : <div style={{ height: 13 }} />}
      <div className="slot-ign">{playerId}</div>
      <div className="slot-team">Pick</div>
      <button
        style={{ fontSize: 8, color: isCaptain ? 'var(--gold)' : 'var(--text-hint)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', marginTop: 2 }}
        onClick={e => { e.stopPropagation(); onSetCaptain(); }}
      >
        {isCaptain ? '★ CAP' : 'Set Cap'}
      </button>
    </div>
  );
}

// ─── Player Picker Modal ──────────────────────────────────────────────────────
function PlayerPickerModal({ currentPlayers, onPick, onClose }) {
  const [region, setRegion] = useState('all');
  const [search, setSearch] = useState('');
  const { players, loading } = usePlayerStats(region, '60');

  const filtered = players.filter(p => {
    if (search && !p.ign.toLowerCase().includes(search.toLowerCase()) && !p.org.toLowerCase().includes(search.toLowerCase())) return false;
    if (currentPlayers.includes(p.ign)) return false;
    return true;
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
        <div className="flex-between" style={{ marginBottom: 16 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Pick a Player</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>×</button>
        </div>

        <input
          className="search-input"
          placeholder="Search by name or team..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
          autoFocus
        />

        <div className="filter-bar">
          {['all','na','eu','ap','la'].map(r => (
            <span key={r} className={`filter-chip${region === r ? ' active' : ''}`} onClick={() => setRegion(r)}>
              {r.toUpperCase()}
            </span>
          ))}
        </div>

        {loading ? <SkeletonCard height={200} /> : (
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {filtered.slice(0, 30).map(p => (
              <div
                key={p.ign}
                className="list-row"
                style={{ marginBottom: 6 }}
                onClick={() => onPick(p)}
              >
                <PlayerAvatarCircle name={p.ign} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{p.ign}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.org}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--red)' }}>
                    {Math.round(p.acs)} ACS
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                    {(p.kd).toFixed(2)} K/D
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)' }}>
                No players found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
