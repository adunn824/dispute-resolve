import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, BookOpen, FileText, Users, Clock, Eye, ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface KbCategory {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  displayOrder: number;
  isActive: boolean;
  articleCount?: number;
}

interface KbArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  categoryId: string;
  status: "draft" | "published" | "archived";
  visibility: "agent" | "compliance" | "admin";
  viewCount: number;
  lastModifiedAt: string;
  authorName: string;
  categoryName: string;
}

export default function KnowledgeBasePage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchResults, setSearchResults] = useState<KbArticle[]>([]);

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery<{ data: KbCategory[] }>({
    queryKey: ["/api", "knowledge-base", "categories"],
  });

  // Fetch featured/recent articles  
  const { data: articlesResponse, isLoading: articlesLoading } = useQuery<{ data: KbArticle[] }>({
    queryKey: ["/api", "knowledge-base", "articles?limit=12&status=published"],
  });

  const articles = articlesResponse?.data || [];

  // Search query with proper React Query usage
  const searchParams = new URLSearchParams({
    q: searchQuery.trim(),
    ...(selectedCategory !== "all" && { categoryId: selectedCategory })
  });
  
  const { data: searchResponse, isLoading: isSearchLoading, refetch: performSearch } = useQuery<{ data: KbArticle[] }>({
    queryKey: ["/api", `knowledge-base/search?${searchParams.toString()}`],
    enabled: false, // Only run when manually triggered
  });

  const searchResultsFromQuery = searchResponse?.data || [];

  // Handle search
  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    performSearch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    // Clear search results by updating state
    setSearchResults([]);
  };

  const filteredArticles = selectedCategory === "all" 
    ? articles 
    : articles.filter(article => article.categoryId === selectedCategory);

  const displayedArticles = searchQuery.trim() ? (searchResultsFromQuery.length > 0 ? searchResultsFromQuery : searchResults) : filteredArticles;

  const canManageContent = user?.role === "admin" || user?.role === "compliance";

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-knowledge-base-title">
            Knowledge Base
          </h1>
          <p className="text-muted-foreground mt-1">
            Documentation and guidance for the complaint & dispute management system
          </p>
        </div>
        {canManageContent && (
          <Link href="/knowledge-base/admin">
            <Button variant="default" data-testid="button-manage-content">
              <FileText className="w-4 h-4 mr-2" />
              Manage Content
            </Button>
          </Link>
        )}
      </div>

      {/* Search Section */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search knowledge base articles..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="pl-10"
                  data-testid="input-knowledge-base-search"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.data?.map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              onClick={handleSearch} 
              disabled={!searchQuery.trim() || isSearchLoading}
              data-testid="button-search-articles"
            >
              {isSearchLoading ? "Searching..." : "Search"}
            </Button>
            {searchQuery && (
              <Button variant="outline" onClick={clearSearch} data-testid="button-clear-search">
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Categories Overview */}
      {!searchQuery && (
        <div>
          <h2 className="text-xl font-semibold mb-4" data-testid="text-categories-title">
            Browse by Category
          </h2>
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.data?.filter(cat => cat.isActive).map((category) => (
                <Card 
                  key={category.id} 
                  className="hover-elevate cursor-pointer"
                  onClick={() => setSelectedCategory(category.id)}
                  data-testid={`card-category-${category.id}`}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-primary" />
                      {category.name}
                    </CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {category.articleCount || 0} articles
                      </span>
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Articles Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold" data-testid="text-articles-title">
            {searchQuery ? `Search Results (${displayedArticles.length})` : 
             selectedCategory === "all" ? "Recent Articles" : "Category Articles"}
          </h2>
          {searchQuery && searchQuery.trim() && (
            <span className="text-sm text-muted-foreground">
              Searching for: "{searchQuery}"
            </span>
          )}
        </div>

        {articlesLoading || isSearchLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : displayedArticles.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchQuery ? "No articles found" : "No articles available"}
                </h3>
                <p className="text-muted-foreground">
                  {searchQuery 
                    ? "Try adjusting your search terms or selecting a different category." 
                    : "There are no published articles in this category yet."}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedArticles.map((article) => (
              <Link key={article.id} href={`/knowledge-base/article/${article.slug}`}>
                <Card className="hover-elevate h-full" data-testid={`card-article-${article.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">{article.title}</CardTitle>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {article.categoryName}
                      </Badge>
                    </div>
                    <CardDescription className="line-clamp-3">
                      {article.summary}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Users className="w-3 h-3" />
                        <span>{article.authorName}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          <span>{article.viewCount}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{new Date(article.lastModifiedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}