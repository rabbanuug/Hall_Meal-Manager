import { Link, usePage } from '@inertiajs/react';
import { BookOpen, Calendar, Folder, Key, LayoutGrid, Users, Utensils } from 'lucide-react';

import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import admin from '@/routes/admin';
import { dashboard } from '@/routes';
import { type NavItem } from '@/types';

import AppLogo from './app-logo';


const footerNavItems: NavItem[] = [];

export function AppSidebar() {
    const { auth } = usePage().props as any;
    const userRole = auth.user.role;

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboard().url,
            icon: LayoutGrid,
        },
    ];

    if (userRole === 'super_admin' || userRole === 'hall_admin') {
        mainNavItems.push({
            title: 'Students',
            href: admin.students.index().url,
            icon: Users,
        });
        mainNavItems.push({
            title: 'Teachers',
            href: '/admin/teachers',
            icon: Users,
        });
        mainNavItems.push({
            title: 'Staffs',
            href: '/admin/staff',
            icon: Users,
        });
        mainNavItems.push({
            title: 'Meal Expenses',
            href: '/admin/meal-expenses',
            icon: Utensils,
        });
        mainNavItems.push({
            title: 'Monthly Costs',
            href: '/admin/monthly-costs',
            icon: BookOpen,
        });
        mainNavItems.push({
            title: 'Manual Booking',
            href: '/admin/manual-booking',
            icon: Calendar,
        });
        mainNavItems.push({
            title: 'Change Password',
            href: '/admin/student-password',
            icon: Key,
        });
    }

    if (userRole === 'student') {
        // Any student specific items if needed
    }

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard().url} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
