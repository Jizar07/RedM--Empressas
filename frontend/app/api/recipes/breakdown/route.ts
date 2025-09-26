import { NextRequest, NextResponse } from 'next/server';
import { MultiSourceRecipeService } from '../../../../lib/MultiSourceRecipeService';

export async function POST(request: NextRequest) {
  try {
    const { recipeId, quantity } = await request.json();

    if (!recipeId || !quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid recipe ID or quantity' },
        { status: 400 }
      );
    }

    const recipeService = new MultiSourceRecipeService();
    const breakdown = recipeService.calculateMaterialBreakdown(recipeId, quantity);

    if (!breakdown) {
      return NextResponse.json(
        { error: 'Recipe not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(breakdown);
  } catch (error) {
    console.error('Error calculating breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to calculate breakdown' },
      { status: 500 }
    );
  }
}