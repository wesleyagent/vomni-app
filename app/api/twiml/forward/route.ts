import { NextResponse } from "next/server";

// GET/POST /api/twiml/forward
// Returns TwiML to forward incoming calls to the business phone number.
// Point your Twilio number's Voice webhook here.
export async function GET() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Dial>${process.env.CALL_FORWARD_TO ?? "+972557716863"}</Dial></Response>`,
    { headers: { "Content-Type": "text/xml" } }
  );
}

export const POST = GET;
