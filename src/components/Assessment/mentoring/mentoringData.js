// DEPRECATED: All mock/static data has been removed
// These exports should now be fetched from the API

// Replace with API calls to fetch:
// - Internal marks from /api/marks/internal
// - Student details from /api/students/:studentId
// - Meeting times from /api/mentoring/meetings

// Example replacement:
// export async function fetchInternalMarks(studentId, classId) {
//   return fetch(`/api/marks/internal?studentId=${studentId}&classId=${classId}`).then(r => r.json());
// }

// export async function fetchStudentDetails(studentId) {
//   return fetch(`/api/students/${studentId}`).then(r => r.json());
// }

export const mockInternalMarks = [];
export const mockStudentsWithDetails = [];

