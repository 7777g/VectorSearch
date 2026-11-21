// PEOPLE TAB (admin only)
// The admin adds admins, sub-admins, members and viewers, and can deactivate the people he added himself.

import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { inputClass, buttonClass, outlineButtonClass, cardClass, roleNames } from '../styles';

function People({ token, myId }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("sub_admin");
  const [error, setError] = useState("");

  async function loadUsers() {
    try {
      const data = await api("/users", { token: token });
      setUsers(data);
    } catch (err) {
      setError(err.message);
    }
  }

  // This runs one time, when this screen opens: it loads the list from the server.
  useEffect(() => {
    loadUsers();
  }, []);

  async function addPerson(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/users", { method: "POST", json: { email: email, password: password, role: role }, token: token });
      setEmail("");
      setPassword("");
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  async function deactivate(id) {
    setError("");
    try {
      await api("/users/" + id, { method: "DELETE", token: token });
      loadUsers();
    } catch (err) {
      setError(err.message);
    }
  }

  // finds the email of the admin who added a person
  function addedBy(id) {
    const found = users.find((u) => u.id === id);
    return found ? found.email : "an admin";
  }

  return (
    <div className='flex flex-col gap-4'>
      <form onSubmit={addPerson} className={cardClass + " grid grid-cols-1 md:grid-cols-4 gap-3"}>
        <input className={inputClass + " mt-0"} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className={inputClass + " mt-0"} type="password" placeholder="Temporary password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <select className={inputClass + " mt-0"} value={role} onChange={(e) => setRole(e.target.value)}>
          <option value="admin">Admin</option>
          <option value="sub_admin">Sub-admin</option>
          <option value="member">Member</option>
          <option value="viewer">Viewer</option>
        </select>
        <button className={buttonClass}>Add person</button>
      </form>

      {error && <p className='text-red-400'>{error}</p>}

      {users.map((person) => (
        <div key={person.id} className={cardClass + " flex flex-wrap justify-between items-center gap-3 " + (person.is_active ? "" : "opacity-50")}>
          <div>
            <p className='font-semibold'>{person.email}</p>
            <p className='text-sm text-[#9EA3AB]'>
              {roleNames[person.role]}
              {person.created_by ? " - added by " + addedBy(person.created_by) : " - first admin"}
              {person.is_active ? "" : " - deactivated"}
            </p>
          </div>
          {person.is_active && person.created_by === myId && (
            <button className={outlineButtonClass} onClick={() => deactivate(person.id)}>Deactivate</button>
          )}
        </div>
      ))}
    </div>
  );
}

export default People;
