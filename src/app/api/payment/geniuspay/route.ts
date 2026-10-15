import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, description, customer, success_url, error_url } = body;

    const geniuspayResponse = await fetch("https://geniuspay.ci/api/v1/merchant/payments", {
      method: "POST",
      headers: {
        "X-API-Key": process.env.GENIUSPAY_API_KEY || "",
        "X-API-Secret": process.env.GENIUSPAY_API_SECRET || "",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amount,
        currency: "XOF",
        description: description || "Paiement CTF Finance",
        customer: {
          name: customer?.name || "Client",
          email: customer?.email || "",
          phone: customer?.phone || "",
          country: "CI",
        },
        success_url: success_url || `${process.env.APP_URL}/payment/success`,
        error_url: error_url || `${process.env.APP_URL}/payment/error`,
      }),
    });

    const data = await geniuspayResponse.json();

    if (!geniuspayResponse.ok) {
      return NextResponse.json({ error: data.message || "Erreur Genius Pay" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      payment_url: data.payment_url,
      reference: data.reference,
    });

  } catch (error) {
    console.error("Erreur Genius Pay:", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}