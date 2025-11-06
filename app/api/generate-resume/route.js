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
You are an expert technical recruiter and resume writer.

I will give you:
1) A candidate's current resume
2) A specific job description

Your task:
- Rewrite and improve the resume content so it is tailored specifically to the job description given.
- Focus on clear bullet points with strong action verbs and measurable impact.
- Include relevant keywords from the job description where it makes sense.
- Keep it concise and professional.
- Return the result as plain text with sections like "Summary", "Experience", "Skills".

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
            "You are a helpful assistant that writes high-quality, job-tailored resumes for software and tech roles.",
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
      JSON.stringify({
        result: content.trim(),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error in /api/generate-resume:", err);
    return new Response(
      JSON.stringify({
        error: "Something went wrong generating the resume.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
