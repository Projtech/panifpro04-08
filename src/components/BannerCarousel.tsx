import { Card, CardContent } from "@/components/ui/card"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Button } from "@/components/ui/button"
import { ArrowRight, Loader2 } from "lucide-react"
import { useEffect, useState } from "react"
import { supabase } from "@/integrations/supabase/client"

interface Banner {
  id: number
  image_url: string
  redirect_url: string
  is_active: boolean
  order_no: number
}

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchBanners() {
      try {
        setLoading(true)
        
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .eq("is_active", true)
          .order("order_no")
        
        if (error) {
          console.error("Erro ao buscar banners:", error)
          setError("Não foi possível carregar os banners")
          return
        }
        
        setBanners(data || [])
      } catch (err) {
        console.error("Erro inesperado:", err)
        setError("Ocorreu um erro inesperado")
      } finally {
        setLoading(false)
      }
    }
    
    fetchBanners()
  }, [])

  return (
    <div className="relative w-full max-w-7xl mx-auto py-6">
      {loading ? (
        <div className="flex justify-center items-center h-64 w-full">
          <Loader2 className="h-12 w-12 animate-spin text-bakery-amber" />
        </div>
      ) : error ? (
        <div className="flex justify-center items-center h-64 w-full bg-red-50 rounded-lg border border-red-200">
          <p className="text-red-500">{error}</p>
        </div>
      ) : banners.length === 0 ? (
        <div className="flex justify-center items-center h-64 w-full bg-gray-50 rounded-lg border border-gray-200">
          <p className="text-gray-500">Nenhum banner disponível no momento.</p>
        </div>
      ) : (
        <Carousel 
          className="w-full"
          opts={{
            align: "start",
            loop: true,
          }}
        >
          <CarouselContent>
            {banners.map((banner) => (
              <CarouselItem key={banner.id}>
                <div className="p-1">
                  <Card className="overflow-hidden border-0">
                    <CardContent className="relative flex aspect-video items-center justify-center p-0">
                      <img
                        src={banner.image_url}
                        alt={`Banner ${banner.id}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg" />
                      <div className="absolute bottom-6 right-6">
                        <a href={banner.redirect_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" className="text-white hover:bg-white/20 backdrop-blur-sm border border-white/20">
                            Saiba mais <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {banners.length > 1 && (
            <>
              <CarouselPrevious className="absolute left-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white/80 border-0" />
              <CarouselNext className="absolute right-4 top-1/2 -translate-y-1/2 z-10 bg-white/50 hover:bg-white/80 border-0" />
            </>
          )}
        </Carousel>
      )}
    </div>
  )
}
