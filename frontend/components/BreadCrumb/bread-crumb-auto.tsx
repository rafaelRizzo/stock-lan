"use client"

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { useBreadcrumbs } from "@/app/hooks/useBreadcrumbs"

export function BreadcrumbAuto() {
    const breadcrumbs = useBreadcrumbs()

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {breadcrumbs.map((item, i) => {
                    const isLast = i === breadcrumbs.length - 1

                    return (
                        <div key={item.href} className="flex items-center">
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{item.label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink>
                                        {item.label}
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>

                            {!isLast && <BreadcrumbSeparator />}
                        </div>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}