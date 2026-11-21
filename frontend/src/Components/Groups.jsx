// GROUPS TAB
// Tally makes the groups by itself from the content of the documents, and they form a tree (groups inside groups).
// Normally nothing needs to be pressed. An admin can still press "Rebuild groups" to make the groups again.

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { buttonClass, cardClass } from '../styles';

// The server sends a flat list. This puts children inside their parents.
function makeTree(list) {
  const byId = {};
  list.forEach((g) => { byId[g.id] = { ...g, children: [] }; });

  const top = [];
  list.forEach((g) => {
    if (g.parent_id && byId[g.parent_id]) {
      byId[g.parent_id].children.push(byId[g.id]);
    } else {
      top.push(byId[g.id]);
    }
  });
  return top;
}

// documents in a group plus all documents in its sub-groups
function countAll(group) {
  let total = group.docs;
  group.children.forEach((child) => { total = total + countAll(child); });
  return total;
}

// Shows one group. It calls itself for the sub-groups, so the tree can have any depth.
function GroupItem({ group, level }) {
  return (
    <details open={level === 0} className='border-l border-[#2B2E33] pl-3'>
      <summary className='flex justify-between gap-3 py-1 font-semibold cursor-pointer'>
        <span>{group.name}</span>
        <span className='bg-[#FFD23F] text-black rounded-full px-3 text-sm font-bold'>{countAll(group)}</span>
      </summary>
      {group.children.map((child) => (
        <GroupItem key={child.id} group={child} level={level + 1} />
      ))}
    </details>
  );
}

function Groups({ token, isAdmin }) {
  const [groups, setGroups] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadGroups() {
    try {
      const data = await api("/groups", { token: token });
      setGroups(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // This runs one time, when this screen opens: it loads the list from the server.
  useEffect(() => {
    loadGroups();
  }, []);

  async function rebuild() {
    setMessage("");
    setError("");
    setLoading(true);
    try {
      const data = await api("/groups/rebuild", { method: "POST", token: token });
      setMessage("Tally found " + data.groups + " groups on its own.");
      loadGroups();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }

  const tree = groups ? makeTree(groups) : [];

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap justify-between items-center gap-3'>
        <p className='text-[#9EA3AB]'>Groups are made automatically from the content of the documents, and new documents join the closest group by themselves. Nobody picks the number of groups.</p>
        {isAdmin && (
          <button className={buttonClass} onClick={rebuild} disabled={loading}>
            {loading ? "Grouping..." : "Rebuild groups"}
          </button>
        )}
      </div>

      {message && <p className='text-[#FFD23F]'>{message}</p>}
      {error && <p className='text-red-400'>{error}</p>}

      <div className={cardClass}>
        {groups && tree.length === 0 && (
          <p className='text-[#9EA3AB]'>No groups yet. They are made automatically once there are at least 10 approved documents.</p>
        )}
        {tree.map((group) => (
          <GroupItem key={group.id} group={group} level={0} />
        ))}
      </div>
    </div>
  );
}

export default Groups;
