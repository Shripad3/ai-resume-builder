import { openai } from "@/lib/openai";

export async function POST(req) {
  try {
    const body = await req.json();
    const { resume, jobDescription } = body;

    if (!resume || !jobDescription) {
      return new Response(
        JSON.stringify({ error: "Missing resume or job description" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const prompt = `
You are an expert career coach and cover letter writer.

I will give you:
1) A candidate's resume
2) A specific job description

Your task:
- Write a tailored cover letter for this job.
- Use a professional, confident tone.
- Make it 3-5 short paragraphs.
- Reference 2-3 concrete experiences or skills from the resume.
- Avoid generic buzzwords and keep it specific to the job.

Return only the final cover letter text, no explanations.

Candidate resume:
${resume}

Job description:
${jobDescription}
`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You write concise, effective cover letters tailored to specific roles.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
    });

    const content = completion.choices?.[0]?.message?.content || "";

    return new Response(
      JSON.stringify({ result: content.trim() }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in /api/generate-cover-letter:", err);
    return new Response(
      JSON.stringify({
        error: "Something went wrong generating the cover letter.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
