"use client";

export default function SyllabusPage() {
  return (
    <main style={{ padding: "2rem" }}>
      <h1>Syllabus Upload</h1>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          alert("Upload logic coming next");
        }}
      >
        <input type="file" accept=".pdf" />
        <br />
        <br />
        <button type="submit">Upload Syllabus</button>
      </form>
    </main>
  );
}
