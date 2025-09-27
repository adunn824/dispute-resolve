import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ArrowLeft, Eye, Calendar, User, Edit, History, Clock, BookOpen } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface KbArticle {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary: string;
  categoryId: string;
  categoryName: string;
  status: "draft" | "published" | "archived";
  visibility: "agent" | "compliance" | "admin";
  viewCount: number;
  authorId: string;
  authorName: string;
  lastModifiedBy: string;
  lastModifiedByName: string;
  createdAt: string;
  updatedAt: string;
  lastModifiedAt: string;
}

interface RelatedArticle {
  id: string;
  title: string;
  slug: string;
  summary: string;
  categoryName: string;
}

export default function KnowledgeBaseArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch article by slug
  const { data: articleResponse, isLoading, error } = useQuery<{ data: KbArticle }>({
    queryKey: ["/api", "knowledge-base", "articles", "slug", slug],
    enabled: !!slug,
  });

  // Fetch related articles (articles in same category)
  const categoryId = articleResponse?.data.categoryId;
  const { data: relatedResponse } = useQuery<{ data: RelatedArticle[] }>({
    queryKey: ["/api", `knowledge-base/articles?categoryId=${categoryId}&limit=4&status=published`],
    enabled: !!categoryId,
  });

  const article = articleResponse?.data;
  const relatedArticles = relatedResponse?.data?.filter(a => a.slug !== slug) || [];
  const canEdit = user?.role === "admin" || user?.role === "compliance";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="space-y-6">
        <Link href="/knowledge-base">
          <Button variant="ghost" data-testid="button-back-to-kb">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Article not found</h3>
              <p className="text-muted-foreground">
                The article you're looking for doesn't exist or you don't have permission to view it.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Link href="/knowledge-base">
          <Button variant="ghost" data-testid="button-back-to-kb">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Knowledge Base
          </Button>
        </Link>
        
        {canEdit && (
          <div className="flex gap-2">
            <Link href={`/knowledge-base/admin/articles/${article.id}/edit`}>
              <Button variant="outline" size="sm" data-testid="button-edit-article">
                <Edit className="w-4 h-4 mr-2" />
                Edit Article
              </Button>
            </Link>
            <Link href={`/knowledge-base/admin/articles/${article.id}/versions`}>
              <Button variant="outline" size="sm" data-testid="button-view-versions">
                <History className="w-4 h-4 mr-2" />
                View History
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Article Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline" data-testid="badge-category">
            {article.categoryName}
          </Badge>
          <Badge 
            variant={article.status === "published" ? "default" : "secondary"}
            data-testid="badge-status"
          >
            {article.status}
          </Badge>
          <Badge variant="outline" data-testid="badge-visibility">
            {article.visibility}
          </Badge>
        </div>

        <h1 className="text-3xl font-bold text-foreground" data-testid="text-article-title">
          {article.title}
        </h1>

        {article.summary && (
          <p className="text-lg text-muted-foreground" data-testid="text-article-summary">
            {article.summary}
          </p>
        )}

        {/* Article Meta */}
        <div className="flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <User className="w-4 h-4" />
            <span data-testid="text-article-author">By {article.authorName}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            <span data-testid="text-article-created">
              Published {new Date(article.createdAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span data-testid="text-article-modified">
              Updated {new Date(article.lastModifiedAt).toLocaleDateString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Eye className="w-4 h-4" />
            <span data-testid="text-article-views">{article.viewCount} views</span>
          </div>
        </div>
      </div>

      <Separator />

      {/* Article Content */}
      <Card>
        <CardContent className="pt-6">
          <div 
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: article.content }}
            data-testid="content-article-body"
          />
        </CardContent>
      </Card>

      {/* Article Footer */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Last modified by <strong>{article.lastModifiedByName}</strong> on{' '}
              {new Date(article.lastModifiedAt).toLocaleString()}
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{article.viewCount} total views</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold" data-testid="text-related-articles-title">
            Related Articles
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {relatedArticles.map((relatedArticle) => (
              <Link key={relatedArticle.id} href={`/knowledge-base/article/${relatedArticle.slug}`}>
                <Card className="hover-elevate h-full" data-testid={`card-related-article-${relatedArticle.id}`}>
                  <CardHeader>
                    <CardTitle className="text-base line-clamp-2">
                      {relatedArticle.title}
                    </CardTitle>
                    <div className="flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {relatedArticle.categoryName}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {relatedArticle.summary}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}