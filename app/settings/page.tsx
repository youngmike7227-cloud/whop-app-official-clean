export default function SettingsPage() {
  return (
    <main style={{maxWidth: 720, margin: "40px auto", padding: 16}}>
      <h1>Settings</h1>
      <form onSubmit={(e)=>{e.preventDefault(); alert("Saved!");}}>
        <div>
          <label>Sportsbooks<br/>
            <input placeholder="Pinnacle, Circa, DraftKings, FanDuel" />
          </label>
        </div>
        <div>
          <label>Leagues<br/>
            <input placeholder="NBA, NFL, EPL" />
          </label>
        </div>
        <div>
          <label>Movement Threshold (cents)<br/>
            <input type="number" min={1} max={50} defaultValue={10} />
          </label>
        </div>
        <div>
          <label>
            <input type="checkbox" defaultChecked/> Enable Notifications
          </label>
        </div>
        <button type="submit">Save</button>
      </form>
    </main>
  )
}