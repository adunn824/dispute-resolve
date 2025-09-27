import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Search, Edit, Trash2, Eye, Calendar, User, BookOpen, FileText, Archive } from "lucide-react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

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
  categoryName: string;
  status: "draft" | "published" | "archived";
  visibility: "agent" | "compliance" | "admin";
  viewCount: number;
  authorId: string;
  authorName: string;
  lastModifiedAt: string;
  createdAt: string;
}

interface KbChangeEvent {
  id: string;
  eventType: "created" | "updated" | "deleted";
  entityType: string;
  entityId: string;
  description: string;
  isProcessed: boolean;
  relatedArticleId: string | null;
  createdAt: string;
  userId: string;
  userName: string;
}

export default function KnowledgeBaseManagement() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch categories
  const { data: categoriesResponse, isLoading: categoriesLoading } = useQuery<{ data: KbCategory[] }>({
    queryKey: ["/api", "knowledge-base", "categories"],
  });

  // Fetch articles
  const articlesQueryParams = new URLSearchParams();
  if (selectedStatus !== "all") articlesQueryParams.set("status", selectedStatus);
  if (selectedCategory !== "all") articlesQueryParams.set("categoryId", selectedCategory);
  if (searchQuery) articlesQueryParams.set("search", searchQuery);
  
  const { data: articlesResponse, isLoading: articlesLoading } = useQuery<{ data: KbArticle[] }>({
    queryKey: ["/api", `knowledge-base/articles?${articlesQueryParams.toString()}`],
  });

  // Fetch change events
  const { data: eventsResponse, isLoading: eventsLoading } = useQuery<{ data: KbChangeEvent[] }>({
    queryKey: ["/api", "knowledge-base/change-events?limit=20&isProcessed=false"],
  });

  const categories = categoriesResponse?.data || [];
  const articles = articlesResponse?.data || [];
  const changeEvents = eventsResponse?.data || [];

  const handleDeleteArticle = async (articleId: string, title: string) => {
    try {
      await apiRequest(`/api/knowledge-base/articles/${articleId}`, {
        method: "DELETE",
      });
      
      toast({
        title: "Article deleted",
        description: `"${title}" has been successfully deleted.`,
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/articles"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete article. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCategory = async (categoryId: string, name: string) => {
    try {
      await apiRequest(`/api/knowledge-base/categories/${categoryId}`, {
        method: "DELETE",
      });
      
      toast({
        title: "Category deleted",
        description: `"${name}" has been successfully deleted.`,
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/categories"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete category. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleProcessChangeEvent = async (eventId: string) => {
    try {
      await apiRequest(`/api/knowledge-base/change-events/${eventId}/processed`, {
        method: "PUT",
        body: JSON.stringify({}),
      });
      
      toast({
        title: "Event processed",
        description: "Change event has been marked as processed.",
      });
      
      await queryClient.invalidateQueries({ queryKey: ["/api/knowledge-base/change-events"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process change event. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "published": return "default";
      case "draft": return "secondary";
      case "archived": return "outline";
      default: return "secondary";
    }
  };

  const getVisibilityBadgeVariant = (visibility: string) => {
    switch (visibility) {
      case "admin": return "destructive";
      case "compliance": return "default";
      case "agent": return "outline";
      default: return "secondary";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground" data-testid="text-kb-admin-title">
            Knowledge Base Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage articles, categories, and content workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/knowledge-base/admin/categories/new">
            <Button variant="outline" data-testid="button-new-category">
              <Plus className="w-4 h-4 mr-2" />
              New Category
            </Button>
          </Link>
          <Link href="/knowledge-base/admin/articles/new">
            <Button data-testid="button-new-article">
              <Plus className="w-4 h-4 mr-2" />
              New Article
            </Button>
          </Link>
        </div>
      </div>

      <Tabs defaultValue="articles" className="space-y-6">
        <TabsList>
          <TabsTrigger value="articles" data-testid="tab-articles">Articles</TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">Categories</TabsTrigger>
          <TabsTrigger value="changes" data-testid="tab-changes">
            Change Events
            {changeEvents.length > 0 && (
              <Badge variant="destructive" className="ml-2 text-xs">
                {changeEvents.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Articles Tab */}
        <TabsContent value="articles" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                    <Input
                      placeholder="Search articles..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-articles"
                    />
                  </div>
                </div>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Articles List */}
          {articlesLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : articles.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No articles found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first knowledge base article to get started.
                  </p>
                  <Link href="/knowledge-base/admin/articles/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Article
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {articles.map((article) => (
                <Card key={article.id} data-testid={`card-article-${article.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg truncate">{article.title}</h3>
                          <Badge variant={getStatusBadgeVariant(article.status)}>
                            {article.status}
                          </Badge>
                          <Badge variant={getVisibilityBadgeVariant(article.visibility)}>
                            {article.visibility}
                          </Badge>
                        </div>
                        <p className="text-muted-foreground mb-3 line-clamp-2">
                          {article.summary}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
                            {article.categoryName}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {article.authorName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(article.lastModifiedAt).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {article.viewCount} views
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Link href={`/knowledge-base/article/${article.slug}`}>
                          <Button variant="ghost" size="sm" data-testid={`button-view-${article.id}`}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </Link>
                        <Link href={`/knowledge-base/admin/articles/${article.id}/edit`}>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-${article.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-${article.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Article</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{article.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteArticle(article.id, article.title)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          {categoriesLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No categories found</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first category to organize articles.
                  </p>
                  <Link href="/knowledge-base/admin/categories/new">
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Category
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <Card key={category.id} data-testid={`card-category-${category.id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="flex items-center gap-2">
                          <BookOpen className="w-5 h-5 text-primary" />
                          {category.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {category.description}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link href={`/knowledge-base/admin/categories/${category.id}/edit`}>
                          <Button variant="ghost" size="sm" data-testid={`button-edit-category-${category.id}`}>
                            <Edit className="w-4 h-4" />
                          </Button>
                        </Link>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" data-testid={`button-delete-category-${category.id}`}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Category</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{category.name}"? This will also affect any articles in this category.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteCategory(category.id, category.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {category.articleCount || 0} articles
                      </span>
                      <Badge variant={category.isActive ? "default" : "secondary"}>
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Change Events Tab */}
        <TabsContent value="changes" className="space-y-6">
          {eventsLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : changeEvents.length === 0 ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <Archive className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No pending changes</h3>
                  <p className="text-muted-foreground">
                    All system changes have been processed and documented.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {changeEvents.map((event) => (
                <Card key={event.id} data-testid={`card-change-event-${event.id}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">
                            {event.eventType}
                          </Badge>
                          <Badge variant="secondary">
                            {event.entityType}
                          </Badge>
                        </div>
                        <p className="font-medium mb-1">{event.description}</p>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {event.userName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(event.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleProcessChangeEvent(event.id)}
                        data-testid={`button-process-event-${event.id}`}
                      >
                        Mark as Processed
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}