import { NextResponse } from 'next/server';
import axios from 'axios';

// API client setup for the watcher service
const apiClient = axios.create({
  baseURL: process.env.INTERNAL_WATCHER_API_URL || 'http://localhost:4000',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export async function GET(request: Request) {
  // Extract project name and search term from query params
  const { searchParams } = new URL(request.url);
  const projectName = searchParams.get('project');
  const searchTerm = searchParams.get('term');

  // Validate required parameters
  if (!projectName) {
    return NextResponse.json(
      { error: 'Project name is required' },
      { status: 400 }
    );
  }

  if (!searchTerm || searchTerm.trim().length < 2) {
    return NextResponse.json(
      { error: 'Search term must be at least 2 characters' },
      { status: 400 }
    );
  }

  try {
    // Call the watcher API endpoint for searching project files
    const response = await apiClient.get(
      `/project/${encodeURIComponent(projectName)}/search?term=${encodeURIComponent(searchTerm)}`
    );

    // Return the files data from the response
    return NextResponse.json({ files: response.data.data });
  } catch (error) {
    console.error('Error searching project files:', error);
    
    // Handle different types of errors
    if (axios.isAxiosError(error)) {
      // Handle 404 specifically
      if (error.response?.status === 404) {
        return NextResponse.json(
          { error: `No files matching "${searchTerm}" found for project: ${projectName}` },
          { status: 404 }
        );
      }

      // Handle 400 specifically
      if (error.response?.status === 400) {
        return NextResponse.json(
          { error: error.response.data.message || 'Invalid search parameters' },
          { status: 400 }
        );
      }

      // Other error with response
      if (error.response?.data?.message) {
        return NextResponse.json(
          { error: error.response.data.message },
          { status: error.response.status || 500 }
        );
      }
    }

    // Generic error handling
    return NextResponse.json(
      { error: 'Failed to search project files' },
      { status: 500 }
    );
  }
}
