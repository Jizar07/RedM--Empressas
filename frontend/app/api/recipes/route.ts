import { NextRequest, NextResponse } from 'next/server';
import { MultiSourceRecipeService } from '../../../lib/MultiSourceRecipeService';

export async function GET(request: NextRequest) {
  try {
    const recipeService = new MultiSourceRecipeService();
    const recipes = recipeService.getAllRecipes();

    return NextResponse.json(recipes);
  } catch (error) {
    console.error('Error fetching recipes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recipes' },
      { status: 500 }
    );
  }
}