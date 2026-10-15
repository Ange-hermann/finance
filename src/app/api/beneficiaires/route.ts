import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const beneficiaires = await prisma.beneficiaire.findMany({
      where: { actif: true },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(beneficiaires);
  } catch (error) {
    console.error('Erreur récupération bénéficiaires:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { nom, telephone, email, modePaiement } = body;

    if (!nom || !telephone || !modePaiement) {
      return NextResponse.json(
        { error: 'Nom, téléphone et mode de paiement requis' },
        { status: 400 }
      );
    }

    const beneficiaire = await prisma.beneficiaire.create({
      data: {
        nom,
        telephone,
        email: email || null,
        modePaiement,
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(beneficiaire, { status: 201 });
  } catch (error) {
    console.error('Erreur création bénéficiaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
