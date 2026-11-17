export const MODULES = {
  "class-timetable": {
    label: "Class Timetable", group: "Academics", description: "Publish and maintain weekly class schedules.", defaultVisibility: "university",
    fields: [
      { key: "day", label: "Day", type: "select", options: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"], required: true },
      { key: "subjectName", label: "Subject", type: "text", required: true },
      { key: "room", label: "Room / Lab", type: "text" },
      { key: "facultyName", label: "Faculty", type: "text" },
      { key: "startTime", label: "Start time", type: "time", required: true },
      { key: "endTime", label: "End time", type: "time", required: true },
    ],
  },
  "exam-timetable": {
    label: "Exam Timetable", group: "Academics", description: "Publish examination dates, sessions and venues.", defaultVisibility: "university",
    fields: [
      { key: "examType", label: "Examination", type: "select", options: ["CIA", "Practical", "End Semester", "Supplementary", "Other"], required: true },
      { key: "subjectName", label: "Subject", type: "text", required: true },
      { key: "examDate", label: "Exam date", type: "date", required: true },
      { key: "startTime", label: "Start time", type: "time", required: true },
      { key: "endTime", label: "End time", type: "time" },
      { key: "venue", label: "Venue", type: "text" },
    ],
  },
  "lesson-plans": {
    label: "Lesson Plans", group: "Teaching", description: "Plan units, topics, outcomes, teaching methods and delivery progress.",
    fields: [
      { key: "unit", label: "Unit", type: "text", required: true },
      { key: "topic", label: "Topic", type: "text", required: true },
      { key: "learningOutcomes", label: "Learning outcomes", type: "textarea" },
      { key: "teachingMethod", label: "Teaching method", type: "select", options: ["Lecture", "Demonstration", "Discussion", "Lab", "Case Study", "Project" ] },
      { key: "plannedDate", label: "Planned date", type: "date" },
      { key: "completionStatus", label: "Delivery status", type: "select", options: ["Planned", "In Progress", "Completed", "Deferred"] },
    ],
  },
  assessment: {
    label: "Assessments", group: "Teaching", description: "Plan internal assessments, rubrics, due dates and student instructions.", defaultVisibility: "class",
    fields: [
      { key: "assessmentType", label: "Assessment type", type: "select", options: ["CIA 1", "CIA 2", "CIA 3", "Assignment", "Quiz", "Practical", "Project", "Other"], required: true },
      { key: "maxMarks", label: "Maximum marks", type: "number", required: true },
      { key: "weightage", label: "Weightage (%)", type: "number" },
      { key: "instructions", label: "Instructions", type: "textarea" },
    ],
  },
  assignments: {
    label: "Assignments", group: "Teaching", description: "Create assignments and publish instructions for enrolled students.", defaultVisibility: "class",
    fields: [
      { key: "subjectName", label: "Subject", type: "text" },
      { key: "maxMarks", label: "Maximum marks", type: "number" },
      { key: "instructions", label: "Instructions", type: "textarea", required: true },
      { key: "resourceUrl", label: "Reference link", type: "url" },
    ],
  },
  "assignment-submissions": {
    label: "Assignment Submissions", group: "Teaching", description: "Submit coursework and review submitted work.",
    fields: [
      { key: "assignmentId", label: "Select assignment", type: "select", required: true, dynamic: "assignments" },
      { key: "submissionUrl", label: "Submission link", type: "url", required: true },
      { key: "submissionNotes", label: "Submission notes", type: "textarea" },
      { key: "marksAwarded", label: "Marks awarded", type: "number" },
      { key: "feedback", label: "Faculty feedback", type: "textarea" },
    ],
  },
  mentoring: {
    label: "Mentoring", group: "Teaching", description: "Record mentoring sessions, action items and follow-up dates.",
    fields: [
      { key: "studentCode", label: "Student ID", type: "text", required: true },
      { key: "sessionDate", label: "Session date", type: "date", required: true },
      { key: "mode", label: "Mode", type: "select", options: ["In Person", "Online", "Phone"] },
      { key: "discussion", label: "Discussion summary", type: "textarea", required: true },
      { key: "followUpDate", label: "Follow-up date", type: "date" },
      { key: "riskLevel", label: "Follow-up priority", type: "select", options: ["Normal", "Watch", "Urgent"] },
    ],
  },
  "mentoring-requests": {
    label: "Mentoring Requests", group: "Student Services", description: "Ask your assigned mentor for a session or academic support.",
    fields: [
      { key: "reason", label: "Reason for request", type: "textarea", required: true },
      { key: "preferredSlot", label: "Preferred time", type: "text" },
    ],
  },
  "academic-calendar": {
    label: "Academic Calendar", group: "Academics", description: "Manage semester milestones, holidays and academic activities.", defaultVisibility: "university",
    fields: [
      { key: "category", label: "Category", type: "select", options: ["Semester", "Holiday", "Examination", "Registration", "Workshop", "Other"] },
      { key: "audience", label: "Audience", type: "text", placeholder: "All students / MCA / Department" },
      { key: "venue", label: "Venue", type: "text" },
    ],
  },
  notices: {
    label: "Notices & Announcements", group: "Communication", description: "Publish official department and university announcements.", defaultVisibility: "university",
    fields: [
      { key: "priority", label: "Priority", type: "select", options: ["Normal", "Important", "Urgent"] },
      { key: "audience", label: "Audience", type: "text", placeholder: "All / Department / Semester" },
      { key: "expiresOn", label: "Expiry date", type: "date" },
      { key: "attachmentUrl", label: "Attachment link", type: "url" },
    ],
  },
  fees: {
    label: "Fee Records", group: "Student Services", description: "Maintain fee heads, due dates, receipts and payment status for individual students.",
    fields: [
      { key: "feeType", label: "Fee head", type: "select", options: ["Tuition", "Examination", "Hostel", "Library", "Transport", "Other"], required: true },
      { key: "amount", label: "Amount (INR)", type: "number", required: true },
      { key: "dueDate", label: "Due date", type: "date" },
      { key: "paidAmount", label: "Paid amount (INR)", type: "number" },
      { key: "receiptReference", label: "Receipt reference", type: "text" },
    ],
    targetStudent: true,
  },
  "fee-queries": {
    label: "Fee Queries", group: "Student Services", description: "Raise a fee or receipt-related question and track its resolution.",
    fields: [
      { key: "queryType", label: "Query type", type: "select", options: ["Fee amount", "Payment not reflected", "Receipt", "Refund", "Other"], required: true },
      { key: "reference", label: "Transaction / receipt reference", type: "text" },
      { key: "details", label: "Details", type: "textarea", required: true },
    ],
  },
  "library-books": {
    label: "Library Catalogue", group: "Student Services", description: "Maintain the searchable library catalogue and copy availability.", defaultVisibility: "university",
    fields: [
      { key: "accessionNumber", label: "Accession number", type: "text", required: true },
      { key: "author", label: "Author", type: "text" },
      { key: "isbn", label: "ISBN", type: "text" },
      { key: "category", label: "Category", type: "text" },
      { key: "totalCopies", label: "Total copies", type: "number" },
      { key: "availableCopies", label: "Available copies", type: "number" },
      { key: "shelf", label: "Shelf / location", type: "text" },
    ],
  },
  "library-requests": {
    label: "Library Requests", group: "Student Services", description: "Request a book, renewal or support from the library.",
    fields: [
      { key: "accessionNumber", label: "Accession number / book title", type: "text", required: true },
      { key: "requestType", label: "Request type", type: "select", options: ["Borrow", "Renew", "Reserve", "Report issue"], required: true },
      { key: "requestedUntil", label: "Needed until", type: "date" },
      { key: "remarks", label: "Remarks", type: "textarea" },
    ],
  },
  "hostel-requests": {
    label: "Hostel Requests", group: "Student Services", description: "Submit and track hostel accommodation requests.",
    fields: [
      { key: "hostelPreference", label: "Hostel preference", type: "text" },
      { key: "roomType", label: "Room type", type: "select", options: ["Single", "Double", "Shared", "No preference"] },
      { key: "emergencyContact", label: "Emergency contact", type: "text", required: true },
      { key: "remarks", label: "Additional information", type: "textarea" },
    ],
  },
  placements: {
    label: "Placement Opportunities", group: "Career Services", description: "Publish company opportunities, eligibility and application deadlines.", defaultVisibility: "university",
    fields: [
      { key: "company", label: "Company", type: "text", required: true },
      { key: "jobRole", label: "Role", type: "text", required: true },
      { key: "location", label: "Location", type: "text" },
      { key: "package", label: "Package / CTC", type: "text" },
      { key: "eligibility", label: "Eligibility", type: "textarea" },
      { key: "applicationUrl", label: "Application link", type: "url" },
    ],
  },
  "placement-applications": {
    label: "Placement Applications", group: "Career Services", description: "Apply to a placement opportunity and track the application status.",
    fields: [
      { key: "opportunity", label: "Select opportunity", type: "select", required: true, dynamic: "placements" },
      { key: "resumeUrl", label: "Resume link", type: "url", required: true },
      { key: "coverNote", label: "Cover note", type: "textarea" },
    ],
  },
  internships: {
    label: "Internship Opportunities", group: "Career Services", description: "Publish internships, duration, stipend and eligibility.", defaultVisibility: "university",
    fields: [
      { key: "company", label: "Company", type: "text", required: true },
      { key: "internshipRole", label: "Internship role", type: "text", required: true },
      { key: "mode", label: "Mode", type: "select", options: ["On-site", "Hybrid", "Remote"] },
      { key: "duration", label: "Duration", type: "text" },
      { key: "stipend", label: "Stipend", type: "text" },
      { key: "eligibility", label: "Eligibility", type: "textarea" },
      { key: "applicationUrl", label: "Application link", type: "url" },
    ],
  },
  "internship-applications": {
    label: "Internship Applications", group: "Career Services", description: "Submit internship applications and supporting links.",
    fields: [
      { key: "internship", label: "Select internship", type: "select", required: true, dynamic: "internships" },
      { key: "resumeUrl", label: "Resume link", type: "url", required: true },
      { key: "coverNote", label: "Cover note", type: "textarea" },
    ],
  },
  "soft-skills": {
    label: "Soft Skills Programmes", group: "Career Services", description: "Publish workshops, training sessions and available seats.", defaultVisibility: "university",
    fields: [
      { key: "programName", label: "Programme", type: "text", required: true },
      { key: "trainer", label: "Trainer", type: "text" },
      { key: "schedule", label: "Schedule", type: "text" },
      { key: "seats", label: "Available seats", type: "number" },
      { key: "location", label: "Location", type: "text" },
    ],
  },
  "soft-skill-enrollments": {
    label: "Soft Skills Enrolment", group: "Career Services", description: "Register for a published soft-skills programme.",
    fields: [
      { key: "programName", label: "Select programme", type: "select", required: true, dynamic: "soft-skills" },
      { key: "motivation", label: "Why do you want to join?", type: "textarea" },
    ],
  },
  "student-requests": {
    label: "Student Requests", group: "Student Services", description: "Submit a general administrative request and track its status.",
    fields: [
      { key: "requestType", label: "Request type", type: "select", options: ["Bonafide", "Transcript", "ID card", "Correction", "Academic support", "Other"], required: true },
      { key: "details", label: "Request details", type: "textarea", required: true },
    ],
  },
};

export const NAVIGATION = {
  admin: [
    { group: "Overview", items: [{ id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" }] },
    { group: "Administration", items: [
      { id: "users", label: "User Management", icon: "Users" },
      { id: "imports", label: "Excel / Bulk Import", icon: "FileSpreadsheet" },
      { id: "academics", label: "Academic Setup", icon: "GraduationCap" },
      { id: "approvals", label: "Approvals & Requests", icon: "ClipboardCheck" },
      { id: "mentor-admin", label: "Mentoring", icon: "Users" },
      { id: "hostel-admin", label: "Hostel Room Allotment", icon: "Building2" },
      { id: "folders", label: "Automatic Data Filing", icon: "FolderTree" },
      { id: "events", label: "Events & University Proposals", icon: "CalendarDays" },
    ] },
    { group: "Reports & Oversight", items: [
      { id: "attendance", label: "Attendance Records", icon: "ClipboardCheck" },
      { id: "marks", label: "CIA & Internal Marks Records", icon: "BarChart3" },
      { id: "reports", label: "Download Reports", icon: "FileSpreadsheet" },
    ] },
    { group: "Academic Modules", items: ["class-timetable", "exam-timetable", "lesson-plans", "assessment", "assignments", "assignment-submissions", "academic-calendar", "notices"].map((id) => ({ id, label: MODULES[id].label, icon: "BookOpen" })) },
    { group: "Student Services", items: ["fees", "fee-queries", "library-books", "library-requests", "hostel-requests", "placements", "placement-applications", "internships", "internship-applications", "soft-skills", "soft-skill-enrollments", "student-requests"].map((id) => ({ id, label: MODULES[id].label, icon: "Briefcase" })) },
  ],
  faculty: [
    { group: "Workspace", items: [{ id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" }, { id: "classes", label: "My Classes", icon: "Users" }, { id: "attendance", label: "Attendance", icon: "ClipboardCheck" }, { id: "marks", label: "CIA & Internal Marks", icon: "BarChart3" }, { id: "events", label: "Events & Proposals", icon: "CalendarDays" }, { id: "imports", label: "Excel / Bulk Import", icon: "FileSpreadsheet" }, { id: "reports", label: "Download Reports", icon: "FileSpreadsheet" }] },
    { group: "Teaching", items: [{ id: "mentor", label: "Mentoring", icon: "Users" }, ...["lesson-plans", "class-timetable", "exam-timetable", "assessment", "assignments", "assignment-submissions"].map((id) => ({ id, label: MODULES[id].label, icon: "BookOpen" }))] },
    { group: "Communication & Career", items: ["academic-calendar", "notices", "placements", "internships", "soft-skills", "library-books"].map((id) => ({ id, label: MODULES[id].label, icon: "CalendarDays" })) },
  ],
  student: [
    { group: "My Academics", items: [{ id: "dashboard", label: "Dashboard", icon: "LayoutDashboard" }, { id: "events", label: "Campus Events", icon: "CalendarDays" }, { id: "attendance", label: "My Attendance", icon: "ClipboardCheck" }, { id: "marks", label: "My Marks", icon: "BarChart3" }, ...["class-timetable", "exam-timetable", "assignments", "assignment-submissions", "assessment", "academic-calendar"].map((id) => ({ id, label: MODULES[id].label, icon: "BookOpen" }))] },
    { group: "Campus Services", items: [{ id: "student-noc", label: "Mentoring", icon: "Users" }, ...["notices", "fees", "fee-queries", "library-books", "library-requests", "hostel-requests", "student-requests"].map((id) => ({ id, label: MODULES[id].label, icon: "Building2" }))] },
    { group: "Career Development", items: ["placements", "placement-applications", "internships", "internship-applications", "soft-skills", "soft-skill-enrollments"].map((id) => ({ id, label: MODULES[id].label, icon: "Briefcase" })) },
  ],
};
