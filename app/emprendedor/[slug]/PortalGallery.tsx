"use client"

import { useState } from "react"

type Props = {
  fotoPrincipal?: string
  galeria?: string[]
}

export default function PortalGallery({ fotoPrincipal, galeria }: Props) {

  const fotos = [fotoPrincipal, ...(galeria || [])].filter(Boolean)

  const [index,setIndex] = useState(0)
  const [open,setOpen] = useState(false)

  const actual = fotos[index]

  function next(){
    setIndex((i)=> (i + 1) % fotos.length)
  }

  function prev(){
    setIndex((i)=> (i - 1 + fotos.length) % fotos.length)
  }

  return (
    <>
      <div
        style={{
          display:"grid",
          gridTemplateColumns:"1fr 120px",
          gap:12
        }}
      >

        {/* FOTO GRANDE */}

        <div
          onClick={()=> setOpen(true)}
          className="group overflow-hidden"
          style={{
            position:"relative",
            borderRadius:20,
            overflow:"hidden",
            border:"1px solid #e5e7eb",
            height:440,
            background:"#f3f4f6",
            cursor:"pointer"
          }}
        >

          {actual ? (
            <img
              src={actual}
              alt=""
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ):(
            <div
              style={{
                height:"100%",
                display:"flex",
                alignItems:"center",
                justifyContent:"center",
                color:"#9ca3af"
              }}
            >
              Sin foto
            </div>
          )}

          <div
            style={{
              position:"absolute",
              bottom:12,
              left:12,
              background:"rgba(0,0,0,.6)",
              color:"#fff",
              padding:"6px 10px",
              borderRadius:999,
              fontSize:13,
              fontWeight:700
            }}
          >
            {fotos.length} fotos
          </div>

        </div>

        {/* MINIATURAS */}

        <div
          style={{
            display:"grid",
            gridTemplateRows:"repeat(4,1fr)",
            gap:10
          }}
        >
          {Array.from({length:4}).map((_,i)=>{

            const foto = fotos[i]

            return(
              <div
                key={i}
                onClick={()=> foto && setIndex(i)}
                style={{
                  borderRadius:16,
                  overflow:"hidden",
                  border: i === index
                    ? "2px solid #2563eb"
                    : "1px solid #e5e7eb",
                  cursor: foto ? "pointer":"default",
                  background:"#f3f4f6",
                  display:"flex",
                  alignItems:"center",
                  justifyContent:"center",
                  fontSize:12,
                  color:"#9ca3af"
                }}
              >

                {foto ? (
                  <img
                    src={foto}
                    style={{
                      width:"100%",
                      height:"100%",
                      objectFit:"cover"
                    }}
                  />
                ):(
                  "Sin foto"
                )}

              </div>
            )
          })}
        </div>

      </div>

      {/* MODAL */}

      {open && (

        <div
          style={{
            position:"fixed",
            inset:0,
            background:"rgba(0,0,0,.85)",
            display:"flex",
            alignItems:"center",
            justifyContent:"center",
            zIndex:50
          }}
        >

          <div
            style={{
              position:"relative",
              width:"90%",
              maxWidth:1000
            }}
          >

            <img
              src={actual}
              style={{
                width:"100%",
                maxHeight:"80vh",
                objectFit:"contain"
              }}
            />

            <button
              onClick={prev}
              style={{
                position:"absolute",
                left:-60,
                top:"50%",
                transform:"translateY(-50%)",
                fontSize:40,
                color:"#fff",
                background:"none",
                border:"none",
                cursor:"pointer"
              }}
            >
              ‹
            </button>

            <button
              onClick={next}
              style={{
                position:"absolute",
                right:-60,
                top:"50%",
                transform:"translateY(-50%)",
                fontSize:40,
                color:"#fff",
                background:"none",
                border:"none",
                cursor:"pointer"
              }}
            >
              ›
            </button>

            <button
              onClick={()=> setOpen(false)}
              style={{
                position:"absolute",
                top:-40,
                right:0,
                fontSize:30,
                color:"#fff",
                background:"none",
                border:"none",
                cursor:"pointer"
              }}
            >
              ✕
            </button>

          </div>

        </div>

      )}

    </>
  )
}