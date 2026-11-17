import { useCallback, useEffect, useMemo, useState } from "react";
import { BedDouble, Building2, LoaderCircle, Plus, RefreshCw, Trash2 } from "lucide-react";
import { api } from "./api";

const EMPTY_ROOM = { hostelName: "", block: "", floor: "", roomNumber: "", roomType: "double", capacity: "2", notes: "" };
const EMPTY_ALLOTMENT = { studentId: "", roomId: "", bedNumber: "1", academicYear: "2026-2027", notes: "" };

export default function HostelAdminWorkspace() {
  const [rooms, setRooms] = useState([]);
  const [allotments, setAllotments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [students, setStudents] = useState([]);
  const [roomForm, setRoomForm] = useState(EMPTY_ROOM);
  const [allotmentForm, setAllotmentForm] = useState(EMPTY_ALLOTMENT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [hostelResponse, userResponse] = await Promise.all([api("/api/admin/hostel"), api("/api/admin/users")]);
      setRooms(hostelResponse.rooms || []); setAllotments(hostelResponse.allotments || []); setRequests(hostelResponse.requests || []);
      setStudents((userResponse.users || []).filter((row) => row.role === "student" && row.isActive !== false));
    } catch (loadError) { setError(loadError.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const roomStats = useMemo(() => new Map(rooms.map((room) => {
    const occupied = allotments.filter((row) => String(row.roomId?._id || row.roomId) === String(room._id)).length;
    return [String(room._id), { occupied, vacant: Math.max(0, Number(room.capacity) - occupied) }];
  })), [rooms, allotments]);

  async function createRoom(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try { await api("/api/admin/hostel/rooms", { method: "POST", body: { ...roomForm, capacity: Number(roomForm.capacity) } }); setRoomForm(EMPTY_ROOM); setSuccess("Hostel room added to the room inventory."); await load(); }
    catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function allocateBed(event) {
    event.preventDefault(); setSaving(true); setError(""); setSuccess("");
    try { await api("/api/admin/hostel/allotments", { method: "POST", body: { ...allotmentForm, bedNumber: Number(allotmentForm.bedNumber) } }); setAllotmentForm(EMPTY_ALLOTMENT); setSuccess("Hostel bed allotted successfully."); await load(); }
    catch (saveError) { setError(saveError.message); }
    finally { setSaving(false); }
  }

  async function releaseAllotment(row) {
    if (!window.confirm(`Release ${row.studentId?.name || "this student's"} hostel bed?`)) return;
    setSaving(true); setError(""); setSuccess("");
    try { await api(`/api/admin/hostel/allotments/${row._id}`, { method: "DELETE" }); setSuccess("Hostel allotment released. The bed is now available."); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  async function removeRoom(room) {
    if (!window.confirm(`Remove room ${room.roomNumber}? Rooms with active occupants cannot be deleted.`)) return;
    setSaving(true); setError(""); setSuccess("");
    try { await api(`/api/admin/hostel/rooms/${room._id}`, { method: "DELETE" }); setSuccess("Room removed from the inventory."); await load(); }
    catch (actionError) { setError(actionError.message); }
    finally { setSaving(false); }
  }

  const selectedRoom = rooms.find((room) => room._id === allotmentForm.roomId);
  return <section className="erp-page">
    <div className="erp-page-head"><div><div className="erp-eyebrow">Administration · Campus services</div><h1>Hostel Room Allotment</h1><p>Create room inventory, allocate beds to students and release beds when students vacate. Only Administrators can manage allotments.</p></div><button className="erp-button erp-button-light" onClick={load} disabled={loading}><RefreshCw size={15}/> Refresh</button></div>
    {error && <div className="erp-alert erp-alert-error">{error}</div>}
    {success && <div className="erp-alert erp-alert-success">{success}</div>}
    <form className="erp-card erp-form-card" onSubmit={createRoom}><div className="erp-card-title"><Building2 size={18}/><div><h2>Add hostel room</h2><p>Room capacity is treated as the number of beds. Each bed can have only one active student allotment.</p></div></div><div className="erp-form-grid">
      <label className="erp-form-field"><span>Hostel name *</span><input className="erp-input" required value={roomForm.hostelName} onChange={(event) => setRoomForm({ ...roomForm, hostelName: event.target.value })} placeholder="Hostel name"/></label>
      <label className="erp-form-field"><span>Block</span><input className="erp-input" value={roomForm.block} onChange={(event) => setRoomForm({ ...roomForm, block: event.target.value })} placeholder="Block A"/></label>
      <label className="erp-form-field"><span>Floor</span><input className="erp-input" value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })}/></label>
      <label className="erp-form-field"><span>Room number *</span><input className="erp-input" required value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })}/></label>
      <label className="erp-form-field"><span>Room type</span><select className="erp-input" value={roomForm.roomType} onChange={(event) => setRoomForm({ ...roomForm, roomType: event.target.value })}><option value="single">Single</option><option value="double">Double</option><option value="triple">Triple</option><option value="dormitory">Dormitory</option><option value="other">Other</option></select></label>
      <label className="erp-form-field"><span>Bed capacity *</span><input className="erp-input" type="number" min="1" max="100" required value={roomForm.capacity} onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })}/></label>
      <label className="erp-form-field"><span>Notes</span><input className="erp-input" value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })}/></label>
      <div className="erp-form-submit"><button className="erp-button" disabled={saving}><Plus size={16}/> Add room</button></div>
    </div></form>
    <div className="erp-card"><div className="erp-card-title"><Building2 size={18}/><div><h2>Room inventory <span className="erp-counter">{rooms.length}</span></h2></div></div>{loading ? <div className="erp-loading"><LoaderCircle className="erp-spin"/> Loading room inventory…</div> : <div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Hostel / Block</th><th>Room</th><th>Type</th><th>Capacity</th><th>Occupied</th><th>Vacant</th><th>Actions</th></tr></thead><tbody>{rooms.map((room) => { const stats = roomStats.get(String(room._id)) || { occupied: 0, vacant: room.capacity }; return <tr key={room._id}><td>{room.hostelName}<small>{room.block || "—"} · {room.floor || "—"}</small></td><td>{room.roomNumber}</td><td>{room.roomType}</td><td>{room.capacity}</td><td>{stats.occupied}</td><td><strong>{stats.vacant}</strong></td><td><button className="erp-button erp-button-danger erp-button-small" disabled={saving || stats.occupied > 0} onClick={() => removeRoom(room)}><Trash2 size={13}/> Remove</button></td></tr>; })}</tbody></table></div>}</div>
    <form className="erp-card erp-form-card" onSubmit={allocateBed}><div className="erp-card-title"><BedDouble size={18}/><div><h2>Allocate a bed to a student</h2><p>Admin assigns the room and bed. The server prevents double-booking and over-capacity.</p></div></div><div className="erp-form-grid">
      <label className="erp-form-field"><span>Student *</span><select className="erp-input" required value={allotmentForm.studentId} onChange={(event) => setAllotmentForm({ ...allotmentForm, studentId: event.target.value })}><option value="">Select student</option>{students.map((row) => <option key={row.id} value={row.id}>{row.name} · {row.usn || row.code}</option>)}</select></label>
      <label className="erp-form-field"><span>Hostel room *</span><select className="erp-input" required value={allotmentForm.roomId} onChange={(event) => { const roomId = event.target.value; setAllotmentForm({ ...allotmentForm, roomId, bedNumber: "1" }); }}><option value="">Select room</option>{rooms.filter((room) => room.isActive !== false && (roomStats.get(String(room._id))?.vacant ?? room.capacity) > 0).map((room) => <option key={room._id} value={room._id}>{room.hostelName} · {room.block} · Room {room.roomNumber} ({roomStats.get(String(room._id))?.vacant ?? room.capacity} vacant)</option>)}</select></label>
      <label className="erp-form-field"><span>Bed number *</span><input className="erp-input" type="number" min="1" max={selectedRoom?.capacity || 100} required value={allotmentForm.bedNumber} onChange={(event) => setAllotmentForm({ ...allotmentForm, bedNumber: event.target.value })}/></label>
      <label className="erp-form-field"><span>Academic year *</span><input className="erp-input" required pattern="\d{4}-\d{4}" value={allotmentForm.academicYear} onChange={(event) => setAllotmentForm({ ...allotmentForm, academicYear: event.target.value })}/></label>
      <label className="erp-form-field"><span>Allotment note</span><input className="erp-input" value={allotmentForm.notes} onChange={(event) => setAllotmentForm({ ...allotmentForm, notes: event.target.value })}/></label>
      <div className="erp-form-submit"><button className="erp-button" disabled={saving || !rooms.length || !students.length}><BedDouble size={16}/> Confirm allotment</button></div>
    </div></form>
    <div className="erp-card"><div className="erp-card-title"><BedDouble size={18}/><div><h2>Active allotments <span className="erp-counter">{allotments.length}</span></h2></div></div><div className="erp-table-wrap"><table className="erp-table"><thead><tr><th>Student</th><th>Hostel</th><th>Room / Bed</th><th>Academic year</th><th>Allocated by</th><th>Actions</th></tr></thead><tbody>{allotments.map((row) => <tr key={row._id}><td>{row.studentId?.name || "—"}<small>{row.studentId?.usn || row.studentId?.code || ""}</small></td><td>{row.roomId?.hostelName || "—"}<small>{row.roomId?.block || ""}</small></td><td>{row.roomId?.roomNumber || "—"} / {row.bedNumber}</td><td>{row.academicYear}</td><td>{row.allocatedBy?.name || "Administrator"}</td><td><button className="erp-button erp-button-danger erp-button-small" disabled={saving} onClick={() => releaseAllotment(row)}>Release bed</button></td></tr>)}</tbody></table></div></div>
    <div className="erp-card"><div className="erp-card-title"><UsersIcon/><div><h2>Student hostel requests <span className="erp-counter">{requests.length}</span></h2><p>Requests are shown for reference. Room allotment is performed by the Administrator above.</p></div></div>{requests.length ? <div className="erp-record-list">{requests.map((row) => <article className="erp-record" key={row._id}><div className="erp-record-main"><h3>{row.title}</h3><p>{row.description || "No details provided."}</p><div className="erp-record-meta"><span>Submitted by {row.createdBy?.name || "Student"}</span><span>{row.status}</span></div></div></article>)}</div> : <div className="erp-empty"><UsersIcon/><strong>No hostel requests</strong></div>}</div>
  </section>;
}

function UsersIcon() { return <BedDouble size={18}/>; }
