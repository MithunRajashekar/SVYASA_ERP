import { useMemo, useState } from "react";

export default function SoftSkills() {
  const [level, setLevel] = useState("all");
  const [completed, setCompleted] = useState([]);
  const [activeSkill, setActiveSkill] = useState(null);
  const [actionMessage, setActionMessage] = useState("");

  const skills = [
    {
      title: "Aptitude Training",
      desc: "Quantitative, Logical reasoning, Verbal",
      level: "Beginner",
      duration: "4 weeks",
      modules: ["Number System", "Percentages", "Logical Puzzles"],
    },
    {
      title: "Communication Skills",
      desc: "Public speaking and interview confidence",
      level: "Beginner",
      duration: "3 weeks",
      modules: ["Self Introduction", "Body Language", "Storytelling"],
    },
    {
      title: "Resume Building",
      desc: "Create professional resumes",
      level: "Intermediate",
      duration: "2 weeks",
      modules: ["ATS Resume Format", "Project Bullets", "GitHub Profile"],
    },
    {
      title: "Mock Interviews",
      desc: "Practice real interview scenarios",
      level: "Advanced",
      duration: "5 weeks",
      modules: ["HR Round", "Technical Round", "Feedback Review"],
    },
    {
      title: "Group Discussion",
      desc: "Improve structured speaking in teams",
      level: "Intermediate",
      duration: "3 weeks",
      modules: ["Opening Statements", "Counter Arguments", "Summaries"],
    },
    {
      title: "Email and Workplace Etiquette",
      desc: "Write clear professional emails and updates",
      level: "Beginner",
      duration: "2 weeks",
      modules: ["Email Basics", "Follow-ups", "Meeting Notes"],
    },
  ];

  const visibleSkills = skills.filter(
    (s) => level === "all" || s.level.toLowerCase() === level.toLowerCase()
  );

  const completedVisible = visibleSkills.filter((s) =>
    completed.includes(s.title)
  ).length;

  const progress = useMemo(() => {
    if (!visibleSkills.length) {
      return 0;
    }
    return Math.round((completedVisible / visibleSkills.length) * 100);
  }, [completedVisible, visibleSkills.length]);

  const toggleComplete = (title) => {
    setCompleted((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title]
    );
    setActionMessage(`Updated progress for ${title}`);
  };

  const startLearning = (skill) => {
    setActiveSkill(skill);
    setActionMessage(`Started learning: ${skill.title}`);
  };

  return (
    <div className="min-h-screen bg-[#f4efe9] p-6">
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <h1 className="text-xl font-bold">Soft Skills</h1>
        <p className="text-sm text-white/90 mt-1">
          Build placement readiness with guided communication and interview tracks.
        </p>
      </div>

      <div className="bg-[#FAF5EC] p-4 rounded-xl shadow mb-6 grid md:grid-cols-4 gap-3">
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="p-3 rounded border"
        >
          <option value="all">Level: All</option>
          <option value="Beginner">Beginner</option>
          <option value="Intermediate">Intermediate</option>
          <option value="Advanced">Advanced</option>
        </select>

        <div className="bg-white p-3 rounded border">Tracks: {visibleSkills.length}</div>
        <div className="bg-white p-3 rounded border">Completed: {completedVisible}</div>
        <div className="bg-white p-3 rounded border">Progress: {progress}%</div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => {
            setCompleted([]);
            setActionMessage("Progress reset successfully");
          }}
          className="border px-3 py-1 rounded"
        >
          Reset Progress
        </button>
      </div>

      {actionMessage && (
        <div className="mb-4 rounded bg-green-50 border border-green-200 text-green-700 p-3 text-sm">
          {actionMessage}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        {visibleSkills.map((s, i) => (
          <div key={i} className="bg-white p-5 rounded-xl shadow hover:shadow-lg">
            <h2 className="font-semibold text-[#1E3A2B]">{s.title}</h2>
            <p className="text-sm text-gray-600 mt-2">{s.desc}</p>
            <p className="text-xs text-gray-500 mt-2">
              Level: {s.level} | Duration: {s.duration}
            </p>

            <div className="mt-3 flex gap-2">
              <button
                onClick={() => startLearning(s)}
                className="bg-[#8B2513] text-white px-3 py-1 rounded"
              >
                Start Learning
              </button>

              <button
                onClick={() => toggleComplete(s.title)}
                className="border px-3 py-1 rounded"
              >
                {completed.includes(s.title) ? "Completed" : "Mark Complete"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {visibleSkills.length === 0 && (
        <div className="mt-6 bg-white p-4 rounded-xl shadow text-center text-gray-600">
          No tracks available for this level.
        </div>
      )}

      {activeSkill && (
        <div className="mt-6 bg-white p-5 rounded-xl shadow">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-[#1E3A2B]">{activeSkill.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{activeSkill.desc}</p>
            </div>
            <button
              onClick={() => setActiveSkill(null)}
              className="border px-3 py-1 rounded"
            >
              Close
            </button>
          </div>

          <div className="mt-4">
            <p className="font-medium text-[#8B2513] mb-2">Learning Modules</p>
            <ul className="list-disc ml-5 text-sm text-gray-700">
              {activeSkill.modules.map((module, idx) => (
                <li key={idx}>{module}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </div>
  );
}