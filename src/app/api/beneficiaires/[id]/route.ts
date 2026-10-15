import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const beneficiaire = await prisma.beneficiaire.findUnique({
      where: { id: params.id },
    });

    if (!beneficiaire) {
      return NextResponse.json({ error: 'Bénéficiaire non trouvé' }, { status: 404 });
    }

    return NextResponse.json(beneficiaire);
  } catch (error) {
    console.error('Erreur récupération bénéficiaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { nom, telephone, email, modePaiement, actif } = body;

    const beneficiaire = await prisma.beneficiaire.update({
      where: { id: params.id },
      data: {
        ...(nom !== undefined && { nom }),
        ...(telephone !== undefined && { telephone }),
        ...(email !== undefined && { email: email || null }),
        ...(modePaiement !== undefined && { modePaiement }),
        ...(actif !== undefined && { actif }),
      },
    });

    return NextResponse.json(beneficiaire);
  } catch (error) {
    console.error('Erreur mise à jour bénéficiaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    await prisma.beneficiaire.update({
      where: { id: params.id },
      data: { actif: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur suppression bénéficiaire:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
