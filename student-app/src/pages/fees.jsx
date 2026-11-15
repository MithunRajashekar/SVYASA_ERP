import { useState } from "react";
import { jsPDF } from "jspdf";
import logo from "../assets/images/logo.png";

// ── Course Years ────────────────────────────────────────────────────────────
const courseYears = ["Year 1", "Year 2", "Year 3", "Year 4"];

// ── Fee Data (Only 5–6 Main Educational Fees) ───────────────────────────────
const feeData = {
  "Year 1": [
    { type: "Tuition Fee", amount: 90000, status: "Paid" },
    { type: "Examination Fee", amount: 10000, status: "Paid" },
    { type: "Library Fee", amount: 4000, status: "Paid" },
    { type: "Laboratory Fee", amount: 5000, status: "Paid" },
    { type: "Sports & Cultural Activities Fee", amount: 3000, status: "Paid" },
    { type: "Development Fee", amount: 6000, status: "Paid" },
  ],
  "Year 2": [
    { type: "Tuition Fee", amount: 95000, status: "Paid" },
    { type: "Examination Fee", amount: 12000, status: "Paid" },
    { type: "Library Fee", amount: 4000, status: "Paid" },
    { type: "Laboratory Fee", amount: 5500, status: "Paid" },
    { type: "Sports & Cultural Activities Fee", amount: 3000, status: "Paid" },
    { type: "Development Fee", amount: 6000, status: "Pending" },
  ],
  "Year 3": [
    { type: "Tuition Fee", amount: 100000, status: "Pending" },
    { type: "Examination Fee", amount: 15000, status: "Pending" },
    { type: "Library Fee", amount: 4000, status: "Paid" },
    { type: "Laboratory Fee", amount: 6000, status: "Paid" },
    { type: "Sports & Cultural Activities Fee", amount: 3000, status: "Paid" },
    { type: "Development Fee", amount: 6000, status: "Paid" },
  ],
  "Year 4": [
    { type: "Tuition Fee", amount: 105000, status: "Paid" },
    { type: "Examination Fee", amount: 15000, status: "Paid" },
    { type: "Library Fee", amount: 4000, status: "Paid" },
    { type: "Laboratory Fee", amount: 6000, status: "Paid" },
    { type: "Sports & Cultural Activities Fee", amount: 3000, status: "Paid" },
    { type: "Development Fee", amount: 6000, status: "Paid" },
  ],
};

// ── Transaction History ─────────────────────────────────────────────────────
const transactions = [
  {
    date: "15 Jan 2026",
    amount: 118000,
    method: "Net Banking",
    status: "Success",
    receiptNo: "RCPT-2026-001",
    transactionId: "TXN123456789",
  },
  {
    date: "10 Nov 2025",
    amount: 95000,
    method: "UPI",
    status: "Success",
    receiptNo: "RCPT-2025-078",
    transactionId: "TXN987654321",
  },
];

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => `₹${n.toLocaleString("en-IN")}`;

const statusClasses = (status) => {
  const map = {
    Paid: "bg-[#E6F4EA] text-[#2E7D32]",
    Pending: "bg-[#FFF4E5] text-[#B45309]",
    Success: "bg-[#E6F4EA] text-[#2E7D32]",
  };
  return map[status] || "bg-gray-50 text-gray-800";
};

// ── Receipt Preview Modal ───────────────────────────────────────────────────
const ReceiptPreview = ({ transaction, onClose, onDownload }) => {
  if (!transaction) return null;

  const generatedDate = new Date().toLocaleDateString("en-IN");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[520px] border border-[#E0D7C8]">
        <div className="border border-[#E0D7C8] p-4">
          <div className="flex items-center mb-2">
            <div className="w-16 h-16 border border-[#E0D7C8] flex items-center justify-center text-xs mr-4">
              <img src={logo} alt="University Logo" />
            </div>
            <div className="text-center w-full text-[#2F2F2F]">
              <h2 className="font-bold text-lg">S-VYASA UNIVERSITY</h2>
              <p className="text-sm">Bengaluru, Karnataka, India</p>
            </div>
          </div>

          <hr className="my-2 border-[#E0D7C8]" />

          <h3 className="text-center font-semibold text-[#2F2F2F]">
            FEE PAYMENT RECEIPT
          </h3>

          <hr className="my-2 border-[#E0D7C8]" />

          <div className="text-sm space-y-1 mt-3 text-[#2F2F2F]">
            <p><strong>Name:</strong> ABC</p>
            <p><strong>U.A.N:</strong> 24G0104646</p>
            <p><strong>Receipt No:</strong> {transaction.receiptNo}</p>
            <p><strong>Transaction ID:</strong> {transaction.transactionId}</p>
            <p><strong>Transaction Date:</strong> {transaction.date}</p>
            <p><strong>Payment Method:</strong> {transaction.method}</p>
            <p><strong>Status:</strong> {transaction.status}</p>
            <p><strong>Amount Paid:</strong> {fmt(transaction.amount)}</p>
          </div>

          <hr className="my-3 border-[#E0D7C8]" />

          <p className="font-semibold text-[#2F2F2F]">
            Total Amount Paid: {fmt(transaction.amount)}
          </p>

          <div className="flex justify-end mt-10 text-[#2F2F2F]">
            <div className="text-center">
              <div className="w-40 border-t border-[#2F2F2F] mb-1"></div>
              <p className="text-sm">Authorized Signatory</p>
            </div>
          </div>

          <hr className="my-3 border-[#E0D7C8]" />

          <div className="flex justify-between text-xs text-[#2F2F2F]">
            <p>This is a computer-generated receipt.</p>
            <p>Generated on: {generatedDate} | Page 1 of 1</p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E0D7C8] rounded-lg text-[#2F2F2F]"
          >
            Close
          </button>
          <button
            onClick={onDownload}
            className="px-4 py-2 text-white rounded-lg bg-[#8B1E1E] hover:bg-[#731717]"
          >
            Download PDF
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main Component ──────────────────────────────────────────────────────────
export default function StudentFeesModule() {
  const [selectedYear, setSelectedYear] = useState("Year 1");
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // ── PDF Generator ─────────────────────────────────────────────────────────
  const downloadReceipt = (transaction) => {
    if (!transaction) return;

    const doc = new jsPDF("p", "mm", "a4");
    const margin = 15;
    const pageWidth = 210;
    const centerX = pageWidth / 2;
    const generatedDate = new Date().toLocaleDateString("en-IN");

    const drawDivider = (y) => {
      doc.setLineWidth(0.4);
      doc.line(margin, y, pageWidth - margin, y);
    };

    // Outer Border
    doc.setLineWidth(0.8);
    doc.rect(10, 10, 190, 277);

    // Logo Placeholder
    doc.rect(margin, 18, 20, 20);
    doc.setFontSize(8);
    doc.text("LOGO", margin + 10, 30, { align: "center" });

    // University Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("S-VYASA UNIVERSITY", centerX, 25, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Bengaluru, Karnataka, India", centerX, 31, { align: "center" });

    drawDivider(38);

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("FEE PAYMENT RECEIPT", centerX, 45, { align: "center" });

    drawDivider(50);

    // Details
    const details = [
      ["Name", "ABC"],
      ["U.A.N", "24G0104646"],
      ["Receipt No", transaction.receiptNo],
      ["Transaction ID", transaction.transactionId],
      ["Transaction Date", transaction.date],
      ["Payment Method", transaction.method],
      ["Status", transaction.status],
      ["Amount Paid", fmt(transaction.amount)],
    ];

    let y = 60;
    const labelX = margin + 5;
    const valueX = margin + 55;

    doc.setFontSize(11);
    details.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, labelX, y);
      doc.setFont("helvetica", "normal");
      doc.text(`: ${value}`, valueX, y);
      y += 10;
    });

    drawDivider(y);

    // Total Amount
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.text(`Total Amount Paid : ${fmt(transaction.amount)}`, labelX, y);

    // Authorized Signatory
    const signY = 240;
    doc.line(pageWidth - margin - 60, signY, pageWidth - margin, signY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(
      "Authorized Signatory",
      pageWidth - margin - 30,
      signY + 5,
      { align: "center" }
    );

    drawDivider(260);

    // Footer
    doc.setFontSize(9);
    doc.text("This is a computer-generated receipt.", margin, 268);
    doc.text(`Generated on: ${generatedDate}`, margin, 275);
    doc.text("Page 1 of 1", pageWidth - margin, 275, { align: "right" });

    doc.save(`${transaction.receiptNo}.pdf`);
  };

  return (
    <div className="bg-[#F3EFE7] font-[Segoe_UI,Georgia,sans-serif] min-h-screen">
      {/* Header */}
      <div className="bg-[var(--color-maroon-dark)] text-white p-5 rounded-xl mb-6 flex justify-between">
        <div>
          <p className="text-xl font-semibold text-white tracking-wide">
            Fee Status
          </p>
          <p className="text-[13px] text-white/70 mt-1">
            S-VYASA University • Academic Year 2025–26
          </p>
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-white bg-white/10 border border-white/35"
        >
          {courseYears.map((year) => (
            <option key={year} value={year} className="text-black">
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-7 space-y-6">
        {/* Fees Status */}
        <div className="bg-[#E8E1D5] rounded-xl border border-[#E0D7C8] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E0D7C8]">
            <span className="font-semibold text-[15px] text-[#2F2F2F]">
              Fees Status • {selectedYear}
            </span>
          </div>

          <table className="w-full border-collapse text-[13px] text-[#2F2F2F]">
            <thead>
              <tr className="bg-[#E0D7C8]">
                <th className="px-4 py-2.5 text-left font-semibold text-xs">
                  Fee Type
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-xs">
                  Amount
                </th>
                <th className="px-4 py-2.5 text-right font-semibold text-xs">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {feeData[selectedYear].map((fee, index) => (
                <tr key={index} className="border-b border-[#E0D7C8]">
                  <td className="px-4 py-3">{fee.type}</td>
                  <td className="px-4 py-3 text-right">{fmt(fee.amount)}</td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClasses(
                        fee.status
                      )}`}
                    >
                      {fee.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Transaction History */}
        <div className="bg-[#E8E1D5] rounded-xl border border-[#E0D7C8] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E0D7C8]">
            <span className="font-semibold text-[15px] text-[#2F2F2F]">
              Transaction History
            </span>
          </div>

          <table className="w-full border-collapse text-[13px] text-[#2F2F2F]">
            <thead>
              <tr className="bg-[#E0D7C8]">
                <th className="px-5 py-2.5 text-left font-semibold text-xs">Date</th>
                <th className="px-5 py-2.5 text-left font-semibold text-xs">Amount Paid</th>
                <th className="px-5 py-2.5 text-left font-semibold text-xs">Mode of Payment</th>
                <th className="px-5 py-2.5 text-left font-semibold text-xs">Status</th>
                <th className="px-5 py-2.5 text-right font-semibold text-xs">Receipt</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t, index) => (
                <tr key={index} className="border-b border-[#E0D7C8]">
                  <td className="px-5 py-3">{t.date}</td>
                  <td className="px-5 py-3 font-semibold text-[#2E7D32]">{fmt(t.amount)}</td>
                  <td className="px-5 py-3">{t.method}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${statusClasses(t.status)}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setSelectedTransaction(t)}
                        className="px-3 py-1.5 text-xs font-semibold text-[#8B1E1E] border border-[#8B1E1E] rounded-lg hover:bg-[#8B1E1E]/10"
                      >
                        View
                      </button>
                      <button
                        onClick={() => downloadReceipt(t)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-[#8B1E1E] hover:bg-[#731717] rounded-lg"
                      >
                        Download
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Preview Modal */}
      {selectedTransaction && (
        <ReceiptPreview
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
          onDownload={() => downloadReceipt(selectedTransaction)}
        />
      )}
    </div>
  );
}