const menuItems = ["Dashboard", "Doctors", "Patients", "Appointments"];

function Sidebar() {
  return (
    <aside className="w-64 border-r border-sky-100 bg-white p-4">
      <h2 className="mb-6 text-lg font-semibold text-brand-primary">HealthFlow</h2>
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <button
            key={item}
            type="button"
            className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-slate-700 hover:bg-brand-primary hover:text-white"
          >
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}

export default Sidebar;
