/**
 * @fileoverview Create Dispute Page — Coming Soon
 */

"use client";

import { ArrowLeft, Scale } from "lucide-react";
import Link from "next/link";
import { motion } from "motion/react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const CreateDisputePage = (): React.JSX.Element => {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 hover:opacity-70 transition-opacity"
          >
            <Scale className="w-6 h-6" />
            <span className="font-serif text-xl tracking-tight">VerifAI</span>
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl w-full"
        >
          <Card className="p-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Scale className="w-8 h-8 text-primary" />
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl font-serif tracking-tight">
                Dispute Creation
              </h1>
              <p className="text-muted-foreground text-lg">
                Connect your wallet to create a new dispute and lock evidence
                on-chain.
              </p>
            </div>

            <div className="pt-6 space-y-4">
              <p className="text-sm text-muted-foreground">
                This feature is currently being built for the AI London 2026
                hackathon demo.
              </p>

              <Button variant="outline" className="gap-2" asChild>
                <Link href="/">
                  <ArrowLeft className="w-4 h-4" />
                  Back to Home
                </Link>
              </Button>
            </div>
          </Card>
        </motion.div>
      </div>
    </main>
  );
};

export default CreateDisputePage;
